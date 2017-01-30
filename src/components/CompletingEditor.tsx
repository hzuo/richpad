import {Editor, EditorState} from "draft-js";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {connect} from "react-redux";
import {Dispatch} from "redux";

import {Completions, setEditorState, State} from "../state/state";

interface CompletingEditorProps {
  completions: Completions;
  editorState: EditorState;
  onChange: (editorState: EditorState) => void;
}

const mapStateToProps = (state: State): any => ({
  completions: state.completions,
  editorState: state.editorState,
});

const mapDispatchToProps = (dispatch: Dispatch<State>): any => ({
  onChange: (editorState: EditorState) => dispatch(setEditorState(editorState)),
});

class CompletingEditorComponent extends React.Component<CompletingEditorProps, undefined> {
  public render() {
    return (
      <div className="editor-container">
        <Editor editorState={this.props.editorState} onChange={this.props.onChange}/>
      </div>
    );
  }
}

export const CompletingEditor = connect(mapStateToProps, mapDispatchToProps)(CompletingEditorComponent);
