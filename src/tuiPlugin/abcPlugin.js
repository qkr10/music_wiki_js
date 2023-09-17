import abcjs from "qkr10-abcjs";
import * as globalVariables from "../globalVariables.js";

let pmModules;
const primeArr = [2, 3, 5, 7, 11,
    13, 17, 19, 23, 29,
    31, 37, 41, 43, 47,
    53, 59, 61, 67, 71,
    73, 79, 83, 89, 97,
    101, 103, 107, 109, 113,
    127, 131, 137, 139, 149,
    151, 157, 163, 167, 173,
    179, 181, 191, 193, 197,
    199, 211, 223, 227, 229,
    233, 239, 241, 251, 257,
    263, 269, 271];

function abcPlugin(context) {
    console.log(context);
    pmModules = {
        pmState: context.pmState,
        pmView: context.pmView,
        pmModel: context.pmModel,
    };

    const toHTMLRenderers = { abc }

    const wysiwygCommands = { replaceABC };

    return { toHTMLRenderers, wysiwygCommands }
}

function abc(node, content) {
    const abcString = node.literal.trim();

    let treePosition = getTreePosition(node);
    let id = `abc${treePosition}`;

    let hash = getHash(abcString);
    let name = `abc${hash}`;
    // console.log(`name : ${name}`);

    const textareaArr = document.getElementsByName(`text${name}`);

    if (treePosition === "" || node.wysiwygNode || textareaArr.length > 0) {
        // console.log("wysiwyg");
        // console.log({ node, content });

        const textarea = textareaArr[0];
        id = `wysiwyg${textarea.id}`;

        renderNewABC(textarea, id);
    } else {
        // console.log("markdown");
        // console.log({ node, content });

        const textarea = document.createElement("textarea");
        textarea.value = abcString;
        textarea.id = `text${id}`;
        textarea.name = `text${name}`;
        textarea.style.display = "none";

        document.body.appendChild(textarea);

        renderNewABC(textarea, id);
    }

    return [
        { type: 'openTag', tagName: 'div', outerNewLine: true, attributes: { id, name } },
        { type: 'closeTag', tagName: 'div', outerNewLine: true }
    ];
}

function renderNewABC(textarea, id) {
    setTimeout(() => {
        const dragging = true;
        const options = {
            dragging,
            clickListener: clickListener.bind(textarea)
        };
        const divEle = document.querySelector(`#${id}`);
        divEle.addEventListener("mousedown", (e) => { e.stopPropagation(); });
        const params = { canvas_id: id, abcjsParams: options };
        const editor = new abcjs.Editor(textarea.id, params);
    },
        1000
    );
}

//getMarkdown() 으로 가져올 텍스트랑 textarea.value 랑 동기화시켜줌
function replaceABC(payload, state, dispatch) {
    // console.log(`replaceABC : `);

    const textarea = payload.textarea;
    const newAbcString = textarea.value;

    let root = state.doc.content
    let treePos = textarea.id.substr(7);
    const result = findByTreePos(treePos, root,
        (node) => node.content,
        (node) => node.nodeSize
    );

    const abcNode = state.doc.nodeAt(result.offset);
    const abcNodeSchema = abcNode.type.schema;
    const abcNodeJSON = abcNode.toJSON();
    const abcFragmentJSON = abcNode.content.toJSON();
    // console.log(abcNode);
    // console.log(abcNodeSchema);
    // console.log(abcNodeJSON);
    // console.log(abcFragmentJSON);

    abcFragmentJSON[0].text = newAbcString;
    const newAbcFragment = pmModules.pmModel.Fragment.fromJSON(abcNodeSchema, abcFragmentJSON);
    const newAbcNode = abcNode.copy(newAbcFragment);
    // console.log(newAbcNode);

    const start = result.offset;
    const end = start + result.node.nodeSize;
    const abcSelection = pmModules.pmState.TextSelection.create(state.doc, start, end);
    const newTr = state.tr.setSelection(abcSelection).replaceSelectionWith(newAbcNode);
    dispatch(newTr);
    // console.log(state.apply(newTr));
    return true;
}

//pitch 숫자 를 pitch 문자열로 변환
function getPitchChar(pitch) {
    const pitches = {
        A: 5,
        B: 6,
        C: 0,
        D: 1,
        E: 2,
        F: 3,
        G: 4,
        a: 12,
        b: 13,
        c: 7,
        d: 8,
        e: 9,
        f: 10,
        g: 11
    };

    return Object.keys(pitches).find(key => pitches[key] === pitch);
}

function changePitchOfNode(beforeNode, pitch) {
    const pitchStr = getPitchChar(pitch);

    // console.log(`changePitchOfNode() :`);
    // console.log({ beforeNode, pitch });

    const findPitchAtNodeByRegex = /[a-zA-Z]/g;
    const resultOfRegex = findPitchAtNodeByRegex.exec(beforeNode);
    if (resultOfRegex === null) {
        console.log(`changePitchAtNode() : ${beforeNode} is not Node`);
        return beforeNode;
    }

    // console.log(`changePitchOfNode() :`);
    // console.log({ resultOfRegex, findPitchAtNodeByRegex });

    const pitchLength = 1;

    const startIndexOfPitch = findPitchAtNodeByRegex.lastIndex - pitchLength;
    const nodeLeftStr = beforeNode.substr(0, startIndexOfPitch);

    const endIndexOfPitch = findPitchAtNodeByRegex.lastIndex;
    const nodeRightStr = beforeNode.substr(endIndexOfPitch);

    // console.log(`changePitchOfNode() :`);
    // console.log({ startIndexOfPitch, nodeLeftStr, endIndexOfPitch, nodeRightStr });

    // console.log(`changePitchOfNode() :`);
    // console.log(`${nodeLeftStr}${pitchStr}${nodeRightStr}`);

    return `${nodeLeftStr}${pitchStr}${nodeRightStr}`;
}

function applyDragChanges(text, dragStart, dragEnd) {
    // console.log(`applyDragChanges() :`);
    // console.log({ text, dragStart, dragEnd });

    const isDragStartFirst = dragStart.pos.start <= dragEnd.pos.start;
    const isSamePos = dragStart.pos.start === dragEnd.pos.start;

    const firstPos = isDragStartFirst ? dragStart.pos : dragEnd.pos;
    const firstNote = isDragStartFirst ? dragStart.note : dragEnd.note;

    const secondPos = !isDragStartFirst ? dragStart.pos : dragEnd.pos;
    const secondNote = !isDragStartFirst ? dragStart.note : dragEnd.note;

    let textArr = [
        text.substr(0, firstPos.start),
        firstNote,
        text.substr(firstPos.end, secondPos.start - firstPos.end),
        secondNote,
        text.substr(secondPos.end)
    ];
    if (isSamePos) {
        textArr = [
            text.substr(0, firstPos.start),
            firstNote,
            text.substr(firstPos.end)
        ];
    }

    // console.log(`applyDragChanges() :`);
    // console.log(textArr);

    const result = textArr.join("");
    return result;
}

//드래그 시작/끝 마다 호출됨
function clickListener(abcelem, tuneNumber, classes, analysis, drag, mouseEvent) {
    const textarea = this;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // console.log(`${start} ~ ${end}`);
    // console.log({ abcelem, tuneNumber, classes, analysis, drag, mouseEvent });

    const selectedNote = textarea.value.substr(start, end - start);
    if (mouseEvent.type === "mousedown") {
        globalVariables.setDragStart({ note: selectedNote, pos: { start, end }, pitch: abcelem.averagepitch });
        return;
    }

    //드래그가 끝났을때
    const dragStart = globalVariables.dragStart;
    const dragEnd = { note: selectedNote, pos: { start, end }, pitch: abcelem.averagepitch };
    let isPosChanged = false;

    if (drag.step !== 0) {
        //음정 변화가 생긴경우
        dragStart.pitch -= drag.step;
        dragStart.note = changePitchOfNode(dragStart.note, dragStart.pitch);
    }
    if (dragStart.pos.start !== dragEnd.pos.start) {
        //음표 위치 변화가 생긴경우
        const tempPos = dragStart.pos;
        dragStart.pos = dragEnd.pos;
        dragEnd.pos = tempPos;
        isPosChanged = true;
    }

    textarea.value = applyDragChanges(textarea.value, dragStart, dragEnd);
    textarea.dispatchEvent(new Event("change"));
    globalVariables.editor.exec("replaceABC", { textarea });
}

function getHash(str, arr = primeArr, r = 1234567891) {
    let j = 0, ret = 0;
    for (let i = 0; i < str.length; i++) {
        ret += str.charCodeAt(i) * arr[j] % r;
        ret %= r;
        j = j == arr.length ? 0 : j + 1;
    }
    return `${ret}`;
}

function getTreePosition(node) {
    let treePosition = "";
    if (node.parent !== undefined) {
        let current = node;
        while (current.id != -1) {
            if (current.prev) {
                current = current.prev;
                treePosition += "b"
            }
            else {
                current = current.parent;
                treePosition += "p";
            }
        }
    }
    return treePosition;
}

function findByTreePos(treePos, root, getChildArr, getNodeSize) {
    let node = root;
    let offset = 0;
    for (let i = 0; i < treePos.length; i++) {
        const ch = treePos[treePos.length - i - 1];
        if (ch == 'p') {
            let count = 0;
            while (treePos[treePos.length - i - count - 2] === 'b') {
                offset += getNodeSize(getChildArr(node)[count]);
                count++;
            }
            node = getChildArr(node)[count];
            i += count;
        }
    }
    return { node, offset };
}

export default abcPlugin;