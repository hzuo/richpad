import {CompositeDecorator, ContentBlock, Editor, EditorState} from "draft-js";
import * as _ from "lodash";
import * as React from "react";

interface CompletingEditorState {
  currentEditorState: EditorState;
}

interface TriggerSpec {
  trigger: string;
  beforeTriggerAllowed: RegExp;
  matchStringAllowed: RegExp;
}

interface MatchProcess {
  triggerSpec: TriggerSpec;
  contentBlockKey: string;
  triggerOffset: number;
  caretOffset: number;
  matchString: string;
}

const getMatchProcessesForContentBlock = (
  triggerSpec: TriggerSpec,
) => (
  contentBlockKey: string,
  contentBlockText: string,
  caretOffset: number,
): MatchProcess[] => {
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
      const matchString = contentBlockText.slice(triggerEnd, caretOffset);
      const beforeGood = beforeTrigger.search(triggerSpec.beforeTriggerAllowed) !== -1;
      const matchStringGood = matchString.search(triggerSpec.matchStringAllowed) !== -1;
      if (beforeGood && matchStringGood) {
        const matchProcess = {
          triggerSpec,
          contentBlockKey,
          triggerOffset: triggerStart,
          caretOffset,
          matchString,
        };
        matchProcesses.push(matchProcess);
      }
    }
    cursor = triggerEnd;
  }
};

const getMatchProcessesForCurrentContentBlock = (triggerSpec: TriggerSpec) => (editorState: EditorState) => {
  const selectionState = editorState.getSelection();
  if (selectionState.isCollapsed()) {
    const contentBlockKey = selectionState.getStartKey();
    const caretOffset = selectionState.getStartOffset();
    const contentBlockText = editorState.getCurrentContent().getBlockForKey(contentBlockKey).getText();
    return getMatchProcessesForContentBlock(triggerSpec)(contentBlockKey, contentBlockText, caretOffset);
  }
  return [];
};

const defaultSpec = (trigger: string): TriggerSpec => ({
  trigger,
  beforeTriggerAllowed: /(^|.*\s)$/,
  matchStringAllowed: /.*/,
});

const mkStrategyForMatchProcesses = (triggerSpec: TriggerSpec) => (editorState: EditorState) => {
  const matchProcessesForCurrentBlock = getMatchProcessesForCurrentContentBlock(triggerSpec)(editorState);
  const currentBlockKeys = _.uniqBy(_.map(matchProcessesForCurrentBlock, (x) => x.contentBlockKey), (x) => x);
  console.assert(currentBlockKeys.length <= 1);
  if (currentBlockKeys.length <= 0) {
    return () => { ; };
  } else {
    const currentBlockKey = currentBlockKeys[0];
    return (contentBlock: ContentBlock, callback: (start: number, end: number) => void): void => {
      if (contentBlock.getKey() === currentBlockKey) {
        // tslint:disable-next-line:no-shadowed-variable
        for (const {triggerSpec, triggerOffset} of matchProcessesForCurrentBlock) {
          const triggerStart = triggerOffset;
          const triggerEnd = triggerStart + triggerSpec.trigger.length;
          callback(triggerStart, triggerEnd);
        }
      }
    };
  }
};

const Completions = (triggerSpec: TriggerSpec) => {
  const component: React.StatelessComponent<{}> = (props) => {
    return (
      <span>
        {props.children}
      </span>
    );
  };
  return component;
};

// TODO parameterize on this
const SPECS = [
  defaultSpec("@"),
  {
    trigger: "#",
    beforeTriggerAllowed: /^|(.*\s)$/,
    matchStringAllowed: /^[^\s]*$/,
  },
  defaultSpec("<>"),
];

export class CompletingEditor extends React.Component<{}, CompletingEditorState> {
  constructor() {
    super();
    this.state = {
      currentEditorState: EditorState.createEmpty(),
    };
  }

  public render() {
    const editorState = this.state.currentEditorState;
    const selectionState = editorState.getSelection();
    const matchProcessesForSpecs = _.map(SPECS, (spec) => getMatchProcessesForCurrentContentBlock(spec)(editorState));
    const printMatchProcesses = _.map(matchProcessesForSpecs, (matchProcessesForSpec, i) => (
      <pre key={i}>
        {JSON.stringify(matchProcessesForSpec, null, 2)}
      </pre>
    ));
    return (
      <div>
        <div className="editor-container">
          <Editor
            editorState={this.state.currentEditorState}
            onChange={this.onEditorStateChange}
          />
        </div>
        {printMatchProcesses}
      </div>
    );
  }

  private onEditorStateChange = (editorState: EditorState): void => {
    const decorators = _.map(SPECS, (spec) => ({
      strategy: mkStrategyForMatchProcesses(spec)(editorState),
      component: Completions(spec),
    }));
    const compositeDecorator = new CompositeDecorator(decorators);
    const decoratedEditorState = EditorState.set(editorState, {decorator: compositeDecorator});
    this.setState({
      currentEditorState: decoratedEditorState,
    });
  }
}
