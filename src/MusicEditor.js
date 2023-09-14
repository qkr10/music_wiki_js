import abcPlugin from './tuiPlugin/abcPlugin';

import Editor from 'qkr10-tui-editor';
import 'qkr10-tui-editor/dist/toastui-editor.css';

import { setEditor } from './globalVariables';

const content = `asdfasdfasdf
$$abc
X:1
T:예시1
K:Bb
Bcde|
$$
asdfasdfasdf
$$abc
K:Bb
Bcde|
$$
aasdfasdf`;

document.addEventListener("DOMContentLoaded", onLoad);

function onLoad() {
  const editor = new Editor({
    el: document.getElementById("editor4"),
    hideModeSwitch: true,
    initialEditType: "wysiwyg",
    plugins: [abcPlugin],
    initialValue: content
  });

  setEditor(editor);
}
