import { EditorView, NodeView } from 'prosemirror-view';
import Node from 'prosemirror-model';

function getDecorations(node, context) {
    context.eventEmitter.emit("rerenderAbc", node);
}

export default function getPmAbcPlugin(context) {
    return new context.pmState.Plugin({
        state: {
            init(_, { doc }) {
                return getDecorations(doc, context);
            },
            apply(tr, set, a, b) {
                return getDecorations(tr.doc, context);
            },
        },
        props: {
            decorations(state) {
                return this.getState(state);
            },
        },
    });
}