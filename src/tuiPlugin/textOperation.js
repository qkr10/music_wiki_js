import Note from "./note";

export default class TextOperation {
    notes = [new Note()]
    text = "";
    textarea = document.createElement("textarea");
    first = new Note();
    second = new Note();

    constructor(text = "") {
        this.text = text;
    }

    begin(textarea) {
        this.texarea = textarea;
        this.text = textarea.value;
    }

    end() {
        this.texarea.value = this.text;
        return this.textarea;
    }

    setNotes(list) {
        this.list = [];
        for (const note of list) {
            this.list.push(note);
        }

        this.first = list[0];
        this.second = list[1];
    }

    swapTwoNotes() {
        const temp = first.pos;
        first.pos = second.pos;
        second.pos = temp;

        this.applyTwoNotesToText();
    }

    moveFirstToSecond() {
        const isSamePos = first.pos.start === second.pos.start;
        if (isSamePos) {
            this.applyTwoNotesToText();
            return;
        }

        let movingNote = first.note;

        if (first.isRest()) { //쉼표라면
            first.note = second.note;
            second.note = movingNote;
        }
        else if (!first.isChord()) { //화음이 아니라면
            first.changePitchOfNote(-1); //쉼표로 바꾸기
        }
        else { //화음이라면
            first.removeNote(first.clickedNote.pos); //클릭된 음표만 지우기
            movingNote = first.clickedNote.note;
        }

        second.addNote(movingNote); //화음 추가하기

        this.applyTwoNotesToText();
    }

    applyTwoNotesToText() {
        const isSameOrder = first.pos.start <= second.pos.start;
        const isSamePos = first.pos.start === second.pos.start;

        const firstPos = isSameOrder ? first.pos : second.pos;
        const firstNote = isSameOrder ? first.note : second.note;

        const secondPos = !isSameOrder ? first.pos : second.pos;
        const secondNote = !isSameOrder ? first.note : second.note;

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

        this.text = textArr.join("");
    }
}