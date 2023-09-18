import { getPmNodeView } from "./pmPlugin/pmNodeView.ts";
import getPmAbcPlugin from "./pmPlugin/pmPlugin";

function abcPlugin(context) {
    console.log(context);

    context.eventEmitter.addEventType('rerenderAbc');

    const toHTMLRenderers = { abc }
    const wysiwygCommands = { replaceABC };
    const wysiwygPlugins = [() => getPmAbcPlugin(context)];
    const wysiwygNodeViews = { customBlock: getPmNodeView() }
    return {
        toHTMLRenderers,
        wysiwygCommands,
        wysiwygPlugins,
        wysiwygNodeViews
    }
}

function abc(node, content) {
    return [
        { type: 'openTag', tagName: 'div', outerNewLine: false },
        { type: 'html', content: node.literal },
        { type: 'closeTag', tagName: 'div', outerNewLine: false }
    ];
}

function replaceABC(payload, state, dispatch) {
    const abcNodeView = payload.nodeView;
    const textarea = abcNodeView.textarea;
    const newAbcString = textarea.value;

    const abcNode = abcNodeView.node;
    const abcNodeSchema = abcNode.type.schema;
    const abcFragmentJSON = abcNode.content.toJSON();

    abcFragmentJSON[0].text = newAbcString;

    const newAbcFragment = pmModules.pmModel.Fragment.fromJSON(abcNodeSchema, abcFragmentJSON);
    const newAbcNode = abcNode.copy(newAbcFragment);

    const start = abcNodeView.getPos();
    const end = start + abcNode.nodeSize;

    const abcSelection = pmModules.pmState.TextSelection.create(state.doc, start, end);
    const newTr = state.tr.setSelection(abcSelection).replaceSelectionWith(newAbcNode);

    dispatch(newTr);
    return true;
}

export default abcPlugin;