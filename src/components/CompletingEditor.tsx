import {EditorState} from "draft-js";
import createMentionPlugin, {defaultSuggestionsFilter} from "draft-js-mention-plugin";
import Editor from "draft-js-plugins-editor";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {connect} from "react-redux";
import {Dispatch} from "redux";

import {INITIAL_COMPLETIONS} from "../state/initialState";
import {Completions, setEditorState, setSearchText, State} from "../state/state";

interface CompletingEditorProps {
  completions: Completions;
  editorState: EditorState;
  peopleSuggestions: any;
  hashtagsSuggestions: any;
  relationsSuggestions: any;
  onChange: (editorState: EditorState) => void;
  onSearchChangePeople: (searchText: string) => void;
  onSearchChangeHashtags: (searchText: string) => void;
  onSearchChangeRelations: (searchText: string) => void;
}

const mapStateToProps = (state: State): any => ({
  completions: state.completions,
  editorState: state.editorState,
  peopleSuggestions: defaultSuggestionsFilter(state.searchTexts.get("@"), INITIAL_COMPLETIONS.get("@")),
  hashtagsSuggestions: defaultSuggestionsFilter(state.searchTexts.get("#"), INITIAL_COMPLETIONS.get("#")),
  relationsSuggestions: defaultSuggestionsFilter(state.searchTexts.get("<>"), INITIAL_COMPLETIONS.get("<>")),
});

const mapDispatchToProps = (dispatch: Dispatch<State>): any => ({
  onChange: (editorState: EditorState) => dispatch(setEditorState(editorState)),
  onSearchChangePeople: (searchText: any) => dispatch(setSearchText("@", searchText.value)),
  onSearchChangeHashtags: (searchText: any) => dispatch(setSearchText("#", searchText.value)),
  onSearchChangeRelations: (searchText: any) => {
    console.assert(searchText.value.charAt(0) === ">");
    const mySearchText = searchText.value.substring(1);
    dispatch(setSearchText("<>", mySearchText));
  },
});

const mentionPluginPeople = createMentionPlugin({
  mentionTrigger: "@",
  mentionPrefix: "@",
  entityMutability: "SEGMENTED",
});
const MentionSuggestionsPeople = mentionPluginPeople.MentionSuggestions;
const mentionPluginHashtags = createMentionPlugin({
  mentionTrigger: "#",
  mentionPrefix: "#",
  entityMutability: "IMMUTABLE",
});
const MentionSuggestionsHashtags = mentionPluginHashtags.MentionSuggestions;
const mentionPluginRelations = createMentionPlugin({
  mentionTrigger: "<>",
  mentionPrefix: "<>",
  entityMutability: "IMMUTABLE",
});
const MentionSuggestionsRelations = mentionPluginRelations.MentionSuggestions;
const plugins = [mentionPluginPeople, mentionPluginHashtags, mentionPluginRelations];

class CompletingEditorComponent extends React.Component<CompletingEditorProps, undefined> {
  public render() {
    return (
      <div className="editor-container">
        <Editor
          editorState={this.props.editorState}
          onChange={this.props.onChange}
          plugins={plugins}
        />
        <MentionSuggestionsPeople
          onSearchChange={this.props.onSearchChangePeople}
          suggestions={this.props.peopleSuggestions}
        />
        <MentionSuggestionsHashtags
          onSearchChange={this.props.onSearchChangeHashtags}
          suggestions={this.props.hashtagsSuggestions}
        />
        <MentionSuggestionsRelations
          onSearchChange={this.props.onSearchChangeRelations}
          suggestions={this.props.relationsSuggestions}
        />
      </div>
    );
  }
}

export const CompletingEditor = connect(mapStateToProps, mapDispatchToProps)(CompletingEditorComponent);
