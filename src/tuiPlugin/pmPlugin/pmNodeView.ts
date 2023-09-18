import { Editor, ClickListenerAnalysis, ClickListenerDrag, AbcElem } from 'qkr10-abcjs';
import type { EditorView, NodeView } from 'prosemirror-view';
import type { Node as ProsemirrorNode, Fragment } from 'prosemirror-model';
import type { Emitter } from 'qkr10-tui-editor';
import Note from '../note';
import * as globalVariables from "../../globalVariables"
import TextOperation from '../textOperation';

export function getPmNodeView() {
    return (node: ProsemirrorNode, view: EditorView, getPos: GetPos, emitter: Emitter) => {
        return new abcNodeView(node, view, getPos, emitter);
    }
}

type GetPos = (() => number) | boolean;

class abcNodeView implements NodeView {
    node: ProsemirrorNode;
    view: EditorView;
    getPos: GetPos;
    eventEmitter: Emitter;
    dom: HTMLElement;
    textarea: HTMLTextAreaElement;
    editor: Editor;
    renderAbcHandler = (node: ProsemirrorNode) => {
        if (this.node.resolve(0).pos === node.resolve(0).pos) {
            this.textarea.dispatchEvent(new Event("change"));
        }
    };

    constructor(
        node: ProsemirrorNode,
        view: EditorView,
        getPos: GetPos,
        eventEmitter: Emitter
    ) {
        this.node = node;
        this.view = view;
        this.getPos = getPos;
        this.eventEmitter = eventEmitter;

        if (node.attrs.info !== "abc") {
            return;
        }

        this.createElement();
        this.bindEvent();
    }

    //
    // 아래 함수 3개는 생성자에서 호출하는 함수
    //

    createElement() {
        const abcString = this.node.content.firstChild.text.trim();
        const hash = this.getHash(abcString);

        const wrapper = document.createElement('div');
        wrapper.id = `abc${hash}`;
        this.dom = wrapper;

        const textarea = document.createElement("textarea");
        textarea.value = abcString;
        textarea.id = `text${wrapper.id}`;
        textarea.style.display = "none";
        document.body.appendChild(textarea);
        this.textarea = textarea;

        setTimeout(() => {
            const dragging = true;
            const options = {
                dragging,
                clickListener: this.clickListener.bind(this)
            };
            const params = { canvas_id: wrapper.id, abcjsParams: options };
            this.dom.addEventListener("onclick", (e) => { e.stopPropagation(); })
            this.editor = new Editor(textarea.id, params);
        },
            1000
        );
    }

    bindEvent() {
        this.eventEmitter.listen('rerenderAbc', this.renderAbcHandler);
    }

    clickListener(abcelem: AbcElem, tuneNumber: number, classes: String, analysis: ClickListenerAnalysis, drag: ClickListenerDrag, mouseEvent: MouseEvent) {
        const textarea = this.textarea;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        // console.log(`${start} ~ ${end}`);
        // console.log({ abcelem, tuneNumber, classes, analysis, drag, mouseEvent });

        const selectedNote = new Note();
        selectedNote.note = textarea.value.substring(start, end);
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
        globalVariables.editor.exec("replaceABC", {
            nodeView: this
        });
    }

    //
    // 아래 함수 3개는 createElement() 에서 호출하는 함수들
    //

    getHash(str: String, arr: number[] | null = null, r = 1234567891) {
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
        arr ??= primeArr;

        let j = 0, ret = 0;
        for (let i = 0; i < str.length; i++) {
            ret += str.charCodeAt(i) * arr[j] % r;
            ret %= r;
            j = j == arr.length ? 0 : j + 1;
        }
        return `${ret}`;
    }

    //
    // 아래 함수 3개는 prose mirror 에서 호출하는 함수들
    //

    stopEvent() {
        return true;
    }

    update(node: ProsemirrorNode) {
        if (!node.sameMarkup(this.node)) {
            return false;
        }

        this.node = node;

        return true;
    }

    destroy() {
        this.eventEmitter.removeEventHandler('rerenderAbc', this.renderAbcHandler);

        // if (this.dom) {
        //     this.dom.removeEventListener('click', this.onClickEditingButton);
        //     this.view.dom.removeEventListener('mousedown', this.finishLanguageEditing);
        //     window.removeEventListener('resize', this.finishLanguageEditing);
        // }

        // this.eventEmitter.removeEventHandler('selectLanguage', this.onSelectLanguage);
        // this.eventEmitter.removeEventHandler('scroll', this.finishLanguageEditing);
        // this.eventEmitter.removeEventHandler('finishLanguageEditing', this.finishLanguageEditing);
    }
}