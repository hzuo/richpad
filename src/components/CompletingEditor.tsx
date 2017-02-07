import {CompositeDecorator, ContentBlock, Editor, EditorState} from "draft-js";
import * as _ from "lodash";
import * as React from "react";

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

const mkDefaultSpec = (trigger: string): TriggerSpec => ({
  trigger,
  beforeTriggerAllowed: /(^|.*\s)$/,
  matchStringAllowed: /.*/,
});

const getActiveMatchProcess = (matchProcesses: MatchProcess[]): MatchProcess => (
  _.maxBy(matchProcesses, (matchProcess) => matchProcess.triggerOffset)
);

const mkStrategyForMatchProcess = (matchProcess: MatchProcess) => (
  (contentBlock: ContentBlock, callback: (start: number, end: number) => void): void => {
    if (contentBlock.getKey() === matchProcess.contentBlockKey) {
      const {triggerOffset, caretOffset} = matchProcess;
      callback(triggerOffset, caretOffset);
    }
  }
);

const mkActiveProcessMarker = (setActiveProcessClientRect: (clientRect: ClientRect) => void) => (
  class extends React.Component<{}, {}> {
    public render() {
      return <span>{this.props.children}</span>;
    }
  }
);

// TODO parameterize on this
const SPECS = [
  mkDefaultSpec("@"),
  {
    trigger: "#",
    beforeTriggerAllowed: /^|(.*\s)$/,
    matchStringAllowed: /^[^\s]*$/,
  },
  mkDefaultSpec("<>"),
];

interface CompletingEditorState {
  currentEditorState: EditorState;
  activeMatchProcess: MatchProcess | null;
  activeProcessClientRect: ClientRect | null;
}

export class CompletingEditor extends React.Component<{}, CompletingEditorState> {
  constructor() {
    super();
    this.state = {
      currentEditorState: EditorState.createEmpty(),
      activeMatchProcess: null,
      activeProcessClientRect: null,
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

  private setActiveProcessClientRect = (clientRect: ClientRect | null) => {
    this.setState({
      activeProcessClientRect: clientRect,
    });
  }

  private onEditorStateChange = (editorState: EditorState): void => {
    const decorators = [];
    const matchProcesses = _.flatMap(SPECS, (triggerSpec) =>
      getMatchProcessesForCurrentContentBlock(triggerSpec)(editorState),
    );
    const activeMatchProcess = _.isEmpty(matchProcesses) ? null : getActiveMatchProcess(matchProcesses);
    if (activeMatchProcess !== null) {
      const decoratorForActiveMatchProcess = {
        strategy: mkStrategyForMatchProcess(activeMatchProcess),
        component: mkActiveProcessMarker(this.setActiveProcessClientRect),
      };
      decorators.push(decoratorForActiveMatchProcess);
    }
    const compositeDecorator = new CompositeDecorator(decorators);
    const decoratedEditorState = EditorState.set(editorState, {decorator: compositeDecorator});
    this.setState({
      currentEditorState: decoratedEditorState,
      activeMatchProcess,
    });
  }
}
