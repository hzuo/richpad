import {Editor, EditorState} from "draft-js";
import * as React from "react";

interface CompletingEditorState {
  currentEditorState: EditorState;
}

interface TriggerSpec {
  trigger: string;
  beforeTriggerAllowed: RegExp;
  afterTriggerAllowed: RegExp;
}

interface MatchString {
  triggerSpec: TriggerSpec;
  contentBlockKey: string;
  triggerOffset: number;
  caretOffset: number;
  value: string;
}

const getMatchStringForTriggerSpec = (triggerSpec: TriggerSpec) => (editorState: EditorState): MatchString | null => {
  const selectionState = editorState.getSelection();
  if (selectionState.isCollapsed()) {
    const contentBlockKey = selectionState.getStartKey();
    const caretOffset = selectionState.getStartOffset();
    const contentState = editorState.getCurrentContent();
    const contentBlock = contentState.getBlockForKey(contentBlockKey);
    const contentBlockText = contentBlock.getText();
    const triggerStart = contentBlockText.indexOf(triggerSpec.trigger);
    if (triggerStart !== -1) {
      const triggerEnd = triggerStart + triggerSpec.trigger.length;
      if (triggerEnd <= caretOffset) {
        const beforeTrigger = contentBlockText.slice(0, triggerStart);
        const afterTrigger = contentBlockText.slice(triggerEnd, caretOffset);
        const beforeGood = triggerSpec.beforeTriggerAllowed.test(beforeTrigger);
        const afterGood = triggerSpec.afterTriggerAllowed.test(afterTrigger);
        if (beforeGood && afterGood) {
          return {
            triggerSpec, contentBlockKey, caretOffset,
            triggerOffset: triggerStart,
            value: afterTrigger,
          };
        }
      }
    }
  }
  return null;
};

const getMatchStringForTrigger = (trigger: string) => getMatchStringForTriggerSpec({
  trigger,
  beforeTriggerAllowed: /(^|.*\s)$/g,
  afterTriggerAllowed: /.*/g,
});

export class CompletingEditor extends React.Component<{}, CompletingEditorState> {
  constructor() {
    super();
    this.state = {
      currentEditorState: EditorState.createEmpty(),
    };
  }

  public render() {
    const selectionState = this.state.currentEditorState.getSelection();
    return (
      <div>
        <div className="editor-container">
          <Editor
            editorState={this.state.currentEditorState}
            onChange={this.onEditorStateChange}
          />
        </div>
        <div>
          {JSON.stringify(getMatchStringForTrigger("@")(this.state.currentEditorState))}
        </div>
        <div>
          {JSON.stringify(getMatchStringForTrigger("#")(this.state.currentEditorState))}
        </div>
        <div>
          {JSON.stringify(getMatchStringForTrigger("<>")(this.state.currentEditorState))}
        </div>
      </div>
    );
  }

  private onEditorStateChange = (editorState: EditorState): void => {
    this.setState({
      currentEditorState: editorState,
    });
  }
}
