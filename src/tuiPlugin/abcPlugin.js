import abcjs from "qkr10-abcjs";
import { getEditor } from "../globalVariables.js";

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
    console.log(`name : ${name}`);

    const textareaArr = document.getElementsByName(`text${name}`);

    if (treePosition === "" || node.wysiwygNode || textareaArr.length > 0) {
        console.log("wysiwyg");
        console.log({ node, content });

        const textarea = textareaArr[0];
        id = `wysiwyg${textarea.id}`;

        setTimeout(
            () => {
                const dragging = true;
                const options = {
                    dragging,
                    clickListener: clickListener.bind(textarea)
                };
                const params = { canvas_id: id, abcjsParams: options };
                const editor = new abcjs.Editor(textarea.id, params);
            },
            1000
        );
    } else {
        console.log("markdown");
        console.log({ node, content });

        const textarea = document.createElement("textarea");
        textarea.value = abcString;
        textarea.id = `text${id}`;
        textarea.name = `text${name}`;
        textarea.style.display = "none";

        document.body.appendChild(textarea);

        setTimeout(
            () => {
                const dragging = true;
                const options = {
                    dragging,
                    clickListener: clickListener.bind(textarea)
                };
                const params = { canvas_id: id, abcjsParams: options };
                const editor = new abcjs.Editor(textarea.id, params);
            },
            1000
        );
    }

    return [
        { type: 'openTag', tagName: 'div', outerNewLine: true, attributes: { id, name } },
        { type: 'closeTag', tagName: 'div', outerNewLine: true }
    ];
}

//getMarkdown() 으로 가져올 텍스트랑 textarea.value 랑 동기화시켜줌
function replaceABC(payload, state, dispatch) {
    console.log(`replaceABC : `);

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
    console.log(abcNode);
    console.log(abcNodeSchema);
    console.log(abcNodeJSON);
    console.log(abcFragmentJSON);

    abcFragmentJSON[0].text = newAbcString;
    const newAbcFragment = pmModules.pmModel.Fragment.fromJSON(abcNodeSchema, abcFragmentJSON);
    const newAbcNode = abcNode.copy(newAbcFragment);
    console.log(newAbcNode);

    const start = result.offset;
    const end = start + result.node.nodeSize;
    const abcSelection = pmModules.pmState.TextSelection.create(state.doc, start, end);
    const newTr = state.tr.setSelection(abcSelection).replaceSelectionWith(newAbcNode);
    dispatch(newTr);
    console.log(state.apply(newTr));
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

    return Object.keys(pitches).find(key => pitches[key] === afterPitch);
}

//드래그 시작/끝 마다 호출됨
function clickListener(abcelem, tuneNumber, classes, analysis, drag, mouseEvent) {
    const textarea = this;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    console.log(`${start} ~ ${end}`);

    const beforeNote = textarea.value.substr(start, end - start);
    const afterPitchChar = getPitchChar(abcelem.averagepitch - drag.step);
    const afterNote = afterPitchChar;

    console.log(afterNote);
    console.log({ abcelem, tuneNumber, classes, analysis, drag, mouseEvent });

    //드래그 시작과 끝이 음정의 변화가 있는 상황
    if (beforeNote !== afterNote) {
        console.log(`${beforeNote} => ${afterNote}`);
        const left = textarea.value.substr(0, start);
        const right = textarea.value.substr(end);
        textarea.value = `${left}${afterNote}${right}`;
        textarea.dispatchEvent(new Event("change"));
        getEditor().exec("replaceABC", { textarea });
    }
    setTimeout(() => getEditor().moveCursorToStart(), 1);
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