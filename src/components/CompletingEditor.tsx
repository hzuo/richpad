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

interface MatchProcess {
  triggerSpec: TriggerSpec;
  contentBlockKey: string;
  triggerOffset: number;
  caretOffset: number;
  matchString: string;
}

const getMatchProcessesForTriggerSpec = (triggerSpec: TriggerSpec) => (editorState: EditorState): MatchProcess[] => {
  const selectionState = editorState.getSelection();
  if (selectionState.isCollapsed()) {
    const contentBlockKey = selectionState.getStartKey();
    const caretOffset = selectionState.getStartOffset();
    const contentState = editorState.getCurrentContent();
    const contentBlock = contentState.getBlockForKey(contentBlockKey);
    const contentBlockText = contentBlock.getText();

    const matchProcesses: MatchProcess[] = [];
    let cursor = 0;
    while (true) {
      const triggerStart = contentBlockText.indexOf(triggerSpec.trigger, cursor);
      if (triggerStart === -1) {
        return matchProcesses;
      }
      const triggerEnd = triggerStart + triggerSpec.trigger.length;
      if (triggerEnd <= caretOffset) {
        const beforeTrigger = contentBlockText.slice(0, triggerStart);
        const afterTrigger = contentBlockText.slice(triggerEnd, caretOffset);
        const beforeGood = beforeTrigger.search(triggerSpec.beforeTriggerAllowed) !== -1;
        const afterGood = afterTrigger.search(triggerSpec.afterTriggerAllowed) !== -1;
        if (beforeGood && afterGood) {
          const matchProcess = {
            triggerSpec,
            contentBlockKey,
            caretOffset,
            triggerOffset: triggerStart,
            matchString: afterTrigger,
          };
          matchProcesses.push(matchProcess);
        }
      }
      cursor = triggerEnd;
    }
  }
  return [];
};

const getMatchProcessesForTrigger = (trigger: string) => getMatchProcessesForTriggerSpec({
  trigger,
  beforeTriggerAllowed: /(^|.*\s)$/,
  afterTriggerAllowed: /.*/,
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
          {JSON.stringify(getMatchProcessesForTrigger("@")(this.state.currentEditorState))}
        </div>
        <div>
          {JSON.stringify(getMatchProcessesForTrigger("#")(this.state.currentEditorState))}
        </div>
        <div>
          {JSON.stringify(getMatchProcessesForTrigger("<>")(this.state.currentEditorState))}
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
