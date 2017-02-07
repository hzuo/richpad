import {CompositeDecorator, ContentBlock, Editor, EditorState} from "draft-js";
import * as _ from "lodash";
import * as React from "react";
import * as ReactDOM from "react-dom";

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

type ClientRectThunk = () => ClientRect | null;

const mkActiveProcessMarker = (setActiveProcessClientRect: (clientRectThunk: ClientRectThunk) => void) => (
  class extends React.Component<{}, {}> {
    private markerRef: React.ReactInstance;

    public componentDidMount() {
      setActiveProcessClientRect(() => {
        if (this.markerRef) {
          const markerElement = ReactDOM.findDOMNode(this.markerRef);
          if (markerElement) {
            return markerElement.getBoundingClientRect();
          }
        }
        return null;
      });
    }

    public componentWillUnmount() {
      setActiveProcessClientRect(() => null);
    }

    public render() {
      return (
        <span
          className="active-process-marker"
          ref={this.setMarkerRef}
        >
          {this.props.children}
        </span>
      );
    }

    private setMarkerRef = (marker: React.ReactInstance) => {
      this.markerRef = marker;
    }
  }
);

// TODO parameterize on this
const SPECS = [
  mkDefaultSpec("@"),
  _.assign(mkDefaultSpec("#"), {
    matchStringAllowed: /^[^\s]*$/,
  }),
  mkDefaultSpec("<>"),
];

interface CompletingEditorState {
  currentEditorState: EditorState;
  activeMatchProcess: MatchProcess | null;
  activeMatchProcessClientRectThunk: ClientRectThunk;
}

export class CompletingEditor extends React.Component<{}, CompletingEditorState> {
  constructor() {
    super();
    this.state = {
      currentEditorState: EditorState.createEmpty(),
      activeMatchProcess: null,
      activeMatchProcessClientRectThunk: () => null,
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

  private setActiveProcessClientRect = (clientRectThunk: ClientRectThunk) => {
    this.setState({
      activeMatchProcessClientRectThunk: clientRectThunk,
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
