import {
  CharacterMetadata,
  CompositeDecorator,
  ContentBlock,
  ContentState,
  Editor,
  EditorState,
  Entity,
  EntityInstance,
  Modifier,
  SelectionState,
} from "draft-js";
import * as _ from "lodash";
import * as React from "react";
import * as ReactDOM from "react-dom";

export interface TriggerSpec {
  trigger: string;
  beforeTriggerAllowed: RegExp;
  matchStringAllowed: RegExp;
}

export const mkDefaultSpec = (trigger: string): TriggerSpec => ({
  trigger,
  beforeTriggerAllowed: /(^|.*\s)$/,
  matchStringAllowed: /.*/,
});

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
  contentBlock: ContentBlock,
  caretOffset: number,
): MatchProcess[] => {
  const contentBlockText = contentBlock.getText();
  const contentBlockKey = contentBlock.getKey();
  const matchProcesses: MatchProcess[] = [];
  let cursor = 0;
  while (true) {
    const triggerStart = contentBlockText.indexOf(triggerSpec.trigger, cursor);
    if (triggerStart === -1) {
      return matchProcesses;
    }
    const triggerEnd = triggerStart + triggerSpec.trigger.length;
    if (triggerEnd <= caretOffset) {
      // TODO we should probably only exclude entities on a specific list
      const interveningEntity = (() => {
        for (let i = triggerStart; i < caretOffset; i++) {
          if (contentBlock.getEntityAt(i) !== null) {
            return true;
          }
        }
        return false;
      })();
      const beforeTrigger = contentBlockText.slice(0, triggerStart);
      const matchString = contentBlockText.slice(triggerEnd, caretOffset);
      const beforeGood = beforeTrigger.search(triggerSpec.beforeTriggerAllowed) !== -1;
      const matchStringGood = matchString.search(triggerSpec.matchStringAllowed) !== -1;
      if (!interveningEntity && beforeGood && matchStringGood) {
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
    const contentBlock = editorState.getCurrentContent().getBlockForKey(contentBlockKey);
    return getMatchProcessesForContentBlock(triggerSpec)(contentBlock, caretOffset);
  }
  return [];
};

const getActiveMatchProcess = (matchProcesses: MatchProcess[]): MatchProcess => (
  _.maxBy(matchProcesses, (matchProcess) => matchProcess.triggerOffset)
);

type RangeFn = (start: number, end: number) => void;

const mkStrategyForMatchProcess = (matchProcess: MatchProcess) => (
  (contentBlock: ContentBlock, callback: RangeFn): void => {
    if (contentBlock.getKey() === matchProcess.contentBlockKey) {
      const {triggerOffset, caretOffset} = matchProcess;
      callback(triggerOffset, caretOffset);
    }
  }
);

type ClientRectThunk = () => ClientRect | null;

const mkActiveProcessMarker = (setActiveProcessClientRectThunk: (clientRectThunk: ClientRectThunk) => void) => (
  class extends React.Component<{}, {}> {
    private markerElement: React.ReactInstance;

    public componentDidMount() {
      setActiveProcessClientRectThunk(() => {
        if (this.markerElement) {
          const markerDOMNode = ReactDOM.findDOMNode(this.markerElement);
          if (markerDOMNode) {
            return markerDOMNode.getBoundingClientRect();
          }
        }
        return null;
      });
    }

    public componentWillUnmount() {
      setActiveProcessClientRectThunk(() => null);
    }

    public render() {
      return (
        <span
          className="active-process-marker"
          ref={this.setMarkerElement}
        >
          {this.props.children}
        </span>
      );
    }

    private setMarkerElement = (markerElement: React.ReactInstance) => {
      this.markerElement = markerElement;
    }
  }
);

interface CompletionItem {
  text: string;
}

interface CompletionsProps {
  completionItems: CompletionItem[];
  selectedIndex: number;
  activeMatchProcessClientRectThunk: ClientRectThunk;
}

interface CompletionsState {
  activeMatchProcessClientRect: ClientRect | null;
}

class Completions extends React.Component<CompletionsProps, CompletionsState> {
  constructor(props: CompletionsProps) {
    super(props);
    this.state = {
      activeMatchProcessClientRect: this.props.activeMatchProcessClientRectThunk(),
    };
  }

  public componentDidMount() {
    this.setState({
      activeMatchProcessClientRect: this.props.activeMatchProcessClientRectThunk(),
    });
  }

  public componentWillReceiveProps(nextProps: CompletionsProps) {
    this.setState({
      activeMatchProcessClientRect: nextProps.activeMatchProcessClientRectThunk(),
    });
  }

  public render() {
    const {completionItems, selectedIndex} = this.props;
    const {activeMatchProcessClientRect} = this.state;
    if (activeMatchProcessClientRect === null) {
      return <noscript/>;
    }
    const style = {
      position: "absolute",
      top: activeMatchProcessClientRect.bottom,
      left: activeMatchProcessClientRect.left,
    };
    const completionItemElements = _.map(completionItems, (completionItem, index) => {
      const extraClassName = (() => {
        if (selectedIndex === index) {
          return "selected-item";
        } else {
          return "";
        }
      })();
      return (
        <div className={`completion-item ${extraClassName}`} key={index}>
          <span className="completion-text">
            {/* nbsp in case completionItem.text is empty */}
            &nbsp;{completionItem.text}&nbsp;
          </span>
        </div>
      );
    });
    return (
      <div style={style}>
        <div className="completions-container">
          {completionItemElements}
        </div>
      </div>
    );
  }
}

const mkStrategyForEntityType = (entityType: string) => (
  (contentBlock: ContentBlock, callback: RangeFn, contentState: ContentState): void => {
    contentBlock.findEntityRanges((characterMetadata) => {
      const entityKey = characterMetadata.getEntity();
      if (entityKey) {
        // TODO these draft typings are terrible...
        const entityInstance: EntityInstance = (contentState as any).getEntity(entityKey);
        return entityInstance.getType() === entityType;
      }
      return false;
    }, callback);
  }
);

const EntityMarker: React.StatelessComponent<{}> = (props) => (
  <span className="entity-marker">{props.children}</span>
);

// the draft typings don't export these types
export type DraftEntityMutability = "MUTABLE" | "IMMUTABLE" | "SEGMENTED";
type DraftHandleValue = "handled" | "not-handled";

export interface CompletionSpec {
  triggerSpec: TriggerSpec;
  completionItems: CompletionItem[];
  entityType: string;
  entityMutability: DraftEntityMutability;
  keepTrigger: boolean;
}

export interface CompletionSpecs {
  [key: string]: CompletionSpec;
}

export interface CompletingEditorProps {
  completionSpecs: CompletionSpecs;
}

export interface CompletingEditorState {
  editorState: EditorState;
  activeMatchProcess: MatchProcess | null;
  activeMatchProcessClientRectThunk: ClientRectThunk;
  selectedIndex: number;
}

const getTriggerSpecs = (completionSpecs: CompletionSpecs): TriggerSpec[] => {
  return _.map(completionSpecs, (completionSpec) => completionSpec.triggerSpec);
};

const getCompletionSpec = (
  completionSpecs: CompletionSpecs,
  matchProcess: MatchProcess | null,
): CompletionSpec | null => {
  // TODO this info should be more easily derivable from matchProcess
  if (matchProcess !== null) {
    const activeCompletionSpec = _.find(
      completionSpecs,
      (completionSpec) => completionSpec.triggerSpec.trigger === matchProcess.triggerSpec.trigger,
    );
    if (activeCompletionSpec !== undefined) {
      return activeCompletionSpec;
    }
  }
  return null;
};

const getMatchingCompletionItems = (
  completionSpecs: CompletionSpecs,
  matchProcess: MatchProcess | null,
): CompletionItem[] => {
  const completionSpec = getCompletionSpec(completionSpecs, matchProcess);
  if (matchProcess !== null && completionSpec !== null) {
    const matchingCompletionItems = _.filter(completionSpec.completionItems, (completionItem) => (
      _.startsWith(_.toLower(completionItem.text), _.toLower(matchProcess.matchString))
    ));
    return _.concat(matchingCompletionItems, {
      text: matchProcess.matchString,
    });
  }
  return [];
};

const boundSelectedIndex = (
  completionSpecs: CompletionSpecs,
  matchProcess: MatchProcess | null,
  selectedIndex: number,
): number => {
  const matchingCompletionItems = getMatchingCompletionItems(completionSpecs, matchProcess);
  if (selectedIndex < 0) {
    return 0;
  } else if (selectedIndex > matchingCompletionItems.length - 1) {
    return matchingCompletionItems.length - 1;
  } else {
    return selectedIndex;
  }
};

const finishCompletion = (
  completionSpecs: CompletionSpecs,
  matchProcess: MatchProcess | null,
  selectedIndex: number,
  editorState: EditorState,
): EditorState | null => {
  const completionSpec = getCompletionSpec(completionSpecs, matchProcess);
  if (matchProcess !== null && completionSpec !== null) {
    // TODO wtf these typings are messed up
    const contentState = editorState.getCurrentContent();
    const contentStateWithEntity: ContentState = (contentState as any).createEntity(
      completionSpec.entityType,
      completionSpec.entityMutability,
    );
    const entityKey: string = (contentStateWithEntity as any).getLastCreatedEntityKey();
    const rangeToReplace = SelectionState.createEmpty(matchProcess.contentBlockKey).merge({
      anchorOffset: matchProcess.triggerOffset,
      focusOffset: matchProcess.caretOffset,
    }) as SelectionState;
    const matchingCompletionItems = getMatchingCompletionItems(completionSpecs, matchProcess);
    const text = (() => {
      const completionText = matchingCompletionItems[selectedIndex].text;
      if (completionSpec.keepTrigger) {
        return `${completionSpec.triggerSpec.trigger}${completionText}`;
      } else {
        return completionText;
      }
    })();
    const contentStateWithCompletion = Modifier.replaceText(
      contentStateWithEntity,
      rangeToReplace,
      text,
      undefined,
      entityKey,
    );
    // TODO use EditorState.push for better undo/redo UX
    const editorState1 = EditorState.set(editorState, {currentContent: contentStateWithCompletion});
    const editorState2 = EditorState.forceSelection(editorState1, contentStateWithCompletion.getSelectionAfter());
    return editorState2;
  }
  return null;
};

export class CompletingEditor extends React.Component<CompletingEditorProps, CompletingEditorState> {
  constructor(props: CompletingEditorProps) {
    super(props);
    this.state = {
      editorState: EditorState.createEmpty(),
      activeMatchProcess: null,
      activeMatchProcessClientRectThunk: () => null,
      selectedIndex: 0,
    };
  }

  public render() {
    const {completionSpecs} = this.props;
    const {editorState, activeMatchProcess, activeMatchProcessClientRectThunk, selectedIndex} = this.state;
    const completionsElement = (() => {
      if (activeMatchProcess) {
        const matchingCompletionItems = getMatchingCompletionItems(this.props.completionSpecs, activeMatchProcess);
        return (
          <Completions
            completionItems={matchingCompletionItems}
            selectedIndex={selectedIndex}
            activeMatchProcessClientRectThunk={activeMatchProcessClientRectThunk}
          />
        );
      }
      return null;
    })();
    const debugMatchProcesses = (() => {
      if ((window as any).__DEV__) {
        const triggerSpecs = getTriggerSpecs(this.props.completionSpecs);
        const matchProcessesForSpecs = _.map(
          triggerSpecs,
          (spec) => getMatchProcessesForCurrentContentBlock(spec)(editorState),
        );
        const printMatchProcesses = _.map(matchProcessesForSpecs, (matchProcessesForSpec, i) => (
          <pre key={i}>
            {JSON.stringify(matchProcessesForSpec, null, 2)}
          </pre>
        ));
        return printMatchProcesses;
      } else {
        return null;
      }
    })();
    return (
      <div>
        <div className="editor-container">
          <Editor
            editorState={editorState}
            onChange={this.onEditorStateChange}
            onUpArrow={this.onUpArrow}
            onDownArrow={this.onDownArrow}
            onTab={this.onTab}
            handleReturn={this.handleReturn}
            handleBeforeInput={this.handleBeforeInput}
          />
        </div>
        {completionsElement}
        {debugMatchProcesses}
      </div>
    );
  }

  private onEditorStateChange = (editorState: EditorState): void => {
    const {completionSpecs} = this.props;
    const decorators: Array<{ strategy: any; component: any; }> = [];
    _.forEach(completionSpecs, (completionSpec) => {
      decorators.push({
        strategy: mkStrategyForEntityType(completionSpec.entityType),
        component: EntityMarker,
      });
    });
    const matchProcesses = _.flatMap(
      getTriggerSpecs(completionSpecs),
      (triggerSpec) => getMatchProcessesForCurrentContentBlock(triggerSpec)(editorState),
    );
    const activeMatchProcess = _.isEmpty(matchProcesses) ? null : getActiveMatchProcess(matchProcesses);
    if (activeMatchProcess !== null) {
      const decoratorForActiveMatchProcess = {
        strategy: mkStrategyForMatchProcess(activeMatchProcess),
        component: mkActiveProcessMarker(this.setActiveProcessClientRectThunk),
      };
      decorators.push(decoratorForActiveMatchProcess);
    }
    const compositeDecorator = new CompositeDecorator(decorators);
    const decoratedEditorState = EditorState.set(editorState, {decorator: compositeDecorator});
    const selectedIndex = activeMatchProcess === null ? 0 : boundSelectedIndex(
      completionSpecs,
      activeMatchProcess,
      this.state.selectedIndex,
    );
    this.setState({
      editorState: decoratedEditorState,
      activeMatchProcess,
      selectedIndex,
    });
  }

  private onUpArrow = (e: React.KeyboardEvent<{}>) => {
    if (this.state.activeMatchProcess) {
      e.preventDefault();
      this.setState({
        selectedIndex: boundSelectedIndex(
          this.props.completionSpecs,
          this.state.activeMatchProcess,
          this.state.selectedIndex - 1,
        ),
      });
    }
  }

  private onDownArrow = (e: React.KeyboardEvent<{}>) => {
    if (this.state.activeMatchProcess) {
      e.preventDefault();
      this.setState({
        selectedIndex: boundSelectedIndex(
          this.props.completionSpecs,
          this.state.activeMatchProcess,
          this.state.selectedIndex + 1,
        ),
      });
    }
  }

  private handleReturn = (e: React.KeyboardEvent<{}>): DraftHandleValue => {
    if (this.state.activeMatchProcess) {
      const newEditorState = finishCompletion(
        this.props.completionSpecs,
        this.state.activeMatchProcess,
        this.state.selectedIndex,
        this.state.editorState,
      );
      if (newEditorState !== null) {
        e.preventDefault();
        this.onEditorStateChange(newEditorState);
        return "handled";
      }
    }
    return "not-handled";
  }

  private onTab = (e: React.KeyboardEvent<{}>) => {
    this.handleReturn(e);
  }

  // TODO this is currently special-casing hashtag, make it generally configurable
  private handleBeforeInput = (chars: string): DraftHandleValue => {
    if (chars === " ") {
      const editorState = (() => {
        const activeCompletionSpec = getCompletionSpec(this.props.completionSpecs, this.state.activeMatchProcess);
        if (activeCompletionSpec !== null && activeCompletionSpec.entityType === "hashtag") {
          return finishCompletion(
            this.props.completionSpecs,
            this.state.activeMatchProcess,
            this.state.selectedIndex,
            this.state.editorState,
          );
        } else {
          return this.state.editorState;
        }
      })();
      if (editorState !== null && editorState.getSelection().isCollapsed()) {
        const contentStateWithAppendedSpace = Modifier.insertText(
          editorState.getCurrentContent(),
          editorState.getSelection(),
          " ",
        );
        const editorState1 = EditorState.set(editorState, {currentContent: contentStateWithAppendedSpace});
        const afterSpaceSelection = contentStateWithAppendedSpace.getSelectionAfter();
        const editorState2 = EditorState.forceSelection(editorState1, afterSpaceSelection);
        this.onEditorStateChange(editorState2);
        return "handled";
      }
    }
    return "not-handled";
  }

  private setActiveProcessClientRectThunk = (clientRectThunk: ClientRectThunk) => {
    this.setState({
      activeMatchProcessClientRectThunk: clientRectThunk,
    });
  }
}
