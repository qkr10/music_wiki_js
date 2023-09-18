import abcjs from "qkr10-abcjs";
import * as globalVariables from "../globalVariables";
import Note from "./note.js";
import TextOperation from "./textOperation";

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

//주어진 textarea element 와 div id 로 악보를 렌더링함.
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

//드래그 시작/끝 마다 호출됨
function clickListener(abcelem, tuneNumber, classes, analysis, drag, mouseEvent) {
    const textarea = this;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // console.log(`${start} ~ ${end}`);
    // console.log({ abcelem, tuneNumber, classes, analysis, drag, mouseEvent });

    const selectedNote = new Note();
    selectedNote.note = textarea.value.substr(start, end - start);
    selectedNote.pos = { start, end };
    selectedNote.pitch = abcelem.averagepitch;
    if (selectedNote.isChord()) {
        const clickedNotePitch = analysis.clickedName;
        selectedNote.getClickedNoteByPitch(clickedNotePitch);
    }

    //드래그가 시작할때만 실행되는 코드
    if (mouseEvent.type === "mousedown") {
        globalVariables.setDragStart(selectedNote);
        return;
    }

    //드래그가 끝났을때만 실행되는 코드
    const dragStart = globalVariables.dragStart;
    const dragEnd = selectedNote;

    dragStart.changePitch(drag.step);

    const textOperation = new TextOperation();
    textOperation.begin(textarea);
    textOperation.setNotes([dragStart, dragEnd]);
    textOperation.moveFirstToSecond();
    textOperation.end();

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