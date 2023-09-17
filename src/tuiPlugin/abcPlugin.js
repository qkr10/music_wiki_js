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
const pitches = {
    z: -1,
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
    return Object.keys(pitches).find(key => pitches[key] === pitch);
}

function changePitchOfNote(beforeNote, pitch) {
    const pitchStr = getPitchChar(pitch);

    // console.log(`changePitchOfNote() :`);
    // console.log({ beforeNote, pitch });

    const findPitchAtNoteByRegex = /[a-zA-Z]/g;
    const resultOfRegex = findPitchAtNoteByRegex.exec(beforeNote);
    if (resultOfRegex === null) {
        console.log(`changePitchAtNote() : ${beforeNote} is not Note`);
        return beforeNote;
    }

    // console.log(`changePitchOfNote() :`);
    // console.log({ resultOfRegex, findPitchAtNoteByRegex });

    const pitchLength = 1;

    const startIndexOfPitch = findPitchAtNoteByRegex.lastIndex - pitchLength;
    const noteLeftStr = beforeNote.substr(0, startIndexOfPitch);

    const endIndexOfPitch = findPitchAtNoteByRegex.lastIndex;
    const noteRightStr = beforeNote.substr(endIndexOfPitch);

    // console.log(`changePitchOfNote() :`);
    // console.log({ startIndexOfPitch, noteLeftStr, endIndexOfPitch, noteRightStr });

    // console.log(`changePitchOfNote() :`);
    // console.log(`${noteLeftStr}${pitchStr}${noteRightStr}`);

    return `${noteLeftStr}${pitchStr}${noteRightStr}`;
}

function isChord(note) {
    return note.indexOf("[") !== -1;
}

function isRest(note) {
    return note.toLowerCase().indexOf("z") !== -1;
}

function getNotesFromChord(chord) {
    return /[\\^]?[a-zA-Z],?[0-9]{0,2}/g.exec(chord);
}

function removeNote(note, pos) {
    const noteLeftStr = note.substr(0, pos.start);
    const noteRightStr = note.substr(pos.end);
    const result = `${noteLeftStr}${noteRightStr}`;
    const notes = getNotesFromChord(result);
    if (notes !== null && notes.length === 1) {
        return notes[0];
    }
    return `${noteLeftStr}${noteRightStr}`;
}

function addNote(chord, note) {
    if (chord === "z") {
        return note;
    }
    if (!isChord(chord)) {
        chord = `[${chord}]`;
    }
    const startBracketIndex = chord.indexOf("[");
    const leftStr = chord.substr(0, startBracketIndex + 1);
    const rightStr = chord.substr(startBracketIndex + 1);
    return `${leftStr}${note}${rightStr}`;
}

function applyDragChanges(text, dragStart, dragEnd, mode = "move") {
    // console.log(`applyDragChanges() :`);
    // console.log({ text, dragStart, dragEnd });

    const isDragStartFirst = dragStart.pos.start <= dragEnd.pos.start;
    const isSamePos = dragStart.pos.start === dragEnd.pos.start;

    let dragStartNote = dragStart.note;
    let dragEndNote = dragEnd.note;

    if (mode === "move" && !isSamePos) {
        let movingNote = dragStartNote;

        if (isRest(movingNote)) { //쉼표라면
            dragStartNote = dragEndNote
            dragEndNote = movingNote;
        }
        else if (!isChord(movingNote)) { //화음이 아니라면
            dragStartNote = changePitchOfNote(dragStartNote, -1); //쉼표로 바꾸기
        }
        else { //화음이라면
            dragStartNote = removeNote(dragStartNote, dragStart.clickedPos); //클릭된 음표만 지우기
            movingNote = dragStart.clickedNote;
        }

        dragEndNote = addNote(dragEndNote, movingNote); //화음 추가하기
    }

    const firstPos = isDragStartFirst ? dragStart.pos : dragEnd.pos;
    const firstNote = isDragStartFirst ? dragStartNote : dragEndNote;

    const secondPos = !isDragStartFirst ? dragStart.pos : dragEnd.pos;
    const secondNote = !isDragStartFirst ? dragStartNote : dragEndNote;

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

function getNotePosFromChordByPitch(chord, pitchStr) {
    const findNoteByRegex = new RegExp(`[\\^]*${pitchStr}[0-9]*`, "g");
    const resultOfRegex = findNoteByRegex.exec(chord);
    if (resultOfRegex === null) {
        console.log(`getNotePosFromChordByPitch() : cannot find ${pitchStr}`);
        return { start: 0, end: 0 };
    }

    const start = chord.indexOf(resultOfRegex[0]);
    const end = start + resultOfRegex[0].length;
    return { start, end };
}

//드래그 시작/끝 마다 호출됨
function clickListener(abcelem, tuneNumber, classes, analysis, drag, mouseEvent) {
    const textarea = this;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // console.log(`${start} ~ ${end}`);
    // console.log({ abcelem, tuneNumber, classes, analysis, drag, mouseEvent });

    const selectedNote = textarea.value.substr(start, end - start);
    let clickedNote, clickedPos, pitch = abcelem.averagepitch;
    if (isChord(selectedNote)) {
        const clickedNotePitch = analysis.clickedName;
        clickedPos = getNotePosFromChordByPitch(selectedNote, clickedNotePitch);
        clickedNote = selectedNote.substr(clickedPos.start, clickedPos.end - clickedPos.start);
        pitch = pitches[clickedNotePitch];
    }
    if (mouseEvent.type === "mousedown") {
        globalVariables.setDragStart({
            note: selectedNote,
            pos: { start, end },
            pitch, clickedNote, clickedPos
        });
        return;
    }

    //드래그가 끝났을때
    const dragStart = globalVariables.dragStart;
    const dragEnd = {
        note: selectedNote,
        pos: { start, end },
        pitch, clickedNote, clickedPos
    };

    if (drag.step !== 0) {
        //dragStart에 음정 변화가 생긴경우
        dragStart.pitch -= drag.step;
        if (isRest(dragStart.note)) {
            ;//쉼표일 경우 음정을 바꾸지 않음
        }
        else if (isChord(dragStart.note)) {
            dragStart.clickedNote = changePitchOfNote(dragStart.clickedNote, dragStart.pitch);
        }
        else {
            dragStart.note = changePitchOfNote(dragStart.note, dragStart.pitch);
        }
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