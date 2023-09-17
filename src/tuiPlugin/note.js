export default class Note {
    note = "";
    pos = { start: 0, end: 0 };
    pitch = 0;
    clickedNote = null;
    pitches = {
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

    constructor(note = "") {
        this.note = note;
    }

    isChord() {
        return this.note.indexOf("[") !== -1;
    }

    isRest() {
        return this.note.toLowerCase().indexOf("z") !== -1;
    }

    getNotesFromChord() {
        return /[\\^]?[a-zA-Z],?[0-9]{0,2}/g.exec(this.note);
    }

    removeNote(pos) {
        const noteLeftStr = this.note.substr(0, pos.start);
        const noteRightStr = this.note.substr(pos.end);
        this.note = `${noteLeftStr}${noteRightStr}`;

        const notes = this.getNotesFromChord();
        if (notes !== null && notes.length === 1) {
            this.note = notes[0];
        }
    }

    addNote(note) {
        if (this.note === "z") {
            this.note = note;
            return;
        }
        if (note === "z") {
            return;
        }

        if (!this.isChord()) {
            this.note = `[${this.note}]`;
        }
        const startBracketIndex = this.note.indexOf("[");
        const leftStr = this.note.substr(0, startBracketIndex + 1);
        const rightStr = this.note.substr(startBracketIndex + 1);
        this.note = `${leftStr}${note}${rightStr}`;
    }

    getClickedNoteByPitch(pitchStr) {
        const findNoteByRegex = new RegExp(`[\\^]*${pitchStr}[0-9]*`, "g");
        const resultOfRegex = findNoteByRegex.exec(this.note);
        if (resultOfRegex === null) {
            console.log(`getClickedNoteByPitch() : cannot find ${pitchStr}`);
            return;
        }

        const clickedNote = new Note();
        clickedNote.pos.start = this.note.indexOf(resultOfRegex[0]);
        clickedNote.pos.end = clickedNote.pos.start + resultOfRegex[0].length;
        clickedNote.note = resultOfRegex[0];
        clickedNote.pitch = this.pitches[pitchStr];
        this.clickedNote = clickedNote;
    }

    changePitch(step) {
        if (step !== 0) {
            // 음정 변화가 생긴경우
            this.pitch -= step;
            if (this.isRest()) {
                ; // 쉼표일 경우 음정을 바꾸지 않음
            }
            else if (this.isChord()) {
                this.clickedNote.changePitchOfNote(this.pitch);
            }
            else {
                this.changePitchOfNote(this.pitch);
            }
        }
    }

    //pitch 숫자 를 pitch 문자열로 변환
    getPitchChar(pitch) {
        return Object.keys(this.pitches).find(key => this.pitches[key] === pitch);
    }

    changePitchOfNote(pitch) {
        const pitchStr = this.getPitchChar(pitch);

        const findPitchAtNoteByRegex = /[a-zA-Z]/g;
        const resultOfRegex = findPitchAtNoteByRegex.exec(this.note);
        if (resultOfRegex === null) {
            console.log(`changePitchAtNote() : ${this.note} is not Note`);
            return this.note;
        }

        const pitchLength = 1;

        const startIndexOfPitch = findPitchAtNoteByRegex.lastIndex - pitchLength;
        const noteLeftStr = this.note.substr(0, startIndexOfPitch);

        const endIndexOfPitch = findPitchAtNoteByRegex.lastIndex;
        const noteRightStr = this.note.substr(endIndexOfPitch);

        this.note = `${noteLeftStr}${pitchStr}${noteRightStr}`;
    }
}