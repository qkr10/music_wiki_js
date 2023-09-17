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
        const temp = this.first.pos;
        this.first.pos = this.second.pos;
        this.second.pos = temp;

        this.applyTwoNotesToText();
    }

    moveFirstToSecond() {
        const isSamePos = this.first.pos.start === this.second.pos.start;
        if (isSamePos) {
            this.applyTwoNotesToText();
            return;
        }

        let movingNote = this.first.note;

        if (this.first.isRest()) { //쉼표라면
            this.first.note = this.second.note;
            this.second.note = movingNote;
        }
        else if (!this.first.isChord()) { //화음이 아니라면
            this.first.changePitchOfNote(-1); //쉼표로 바꾸기
        }
        else { //화음이라면
            this.first.removeNote(this.first.clickedNote.pos); //클릭된 음표만 지우기
            movingNote = this.first.clickedNote.note;
        }

        this.second.addNote(movingNote); //화음 추가하기

        this.applyTwoNotesToText();
    }

    applyTwoNotesToText() {
        const isSameOrder = this.first.pos.start <= this.second.pos.start;
        const isSamePos = this.first.pos.start === this.second.pos.start;

        const firstPos = isSameOrder ? this.first.pos : this.second.pos;
        const firstNote = isSameOrder ? this.first.note : this.second.note;

        const secondPos = !isSameOrder ? this.first.pos : this.second.pos;
        const secondNote = !isSameOrder ? this.first.note : this.second.note;

        let textArr = [
            this.text.substr(0, firstPos.start),
            firstNote,
            this.text.substr(firstPos.end, secondPos.start - firstPos.end),
            secondNote,
            this.text.substr(secondPos.end)
        ];

        if (isSamePos) {
            textArr = [
                this.text.substr(0, firstPos.start),
                firstNote,
                this.text.substr(firstPos.end)
            ];
        }

        this.text = textArr.join("");
    }
}