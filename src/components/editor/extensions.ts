import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Typography from "@tiptap/extension-typography";
import StarterKit from "@tiptap/starter-kit";

type DocumentEditorExtensionsOptions = {
  placeholder?: string;
};

const CervoTaskItem = TaskItem.extend({
  addInputRules() {
    return [];
  },
});

export function getDocumentEditorExtensions({ placeholder }: DocumentEditorExtensionsOptions = {}) {
  return [
    StarterKit.configure({
      heading: false,
      link: false,
    }),
    Link.configure({
      autolink: true,
      defaultProtocol: "https",
      openOnClick: false,
    }),
    Placeholder.configure({
      placeholder: placeholder ?? "Write something down...",
    }),
    TaskList,
    CervoTaskItem.configure({
      nested: true,
    }),
    Typography,
  ];
}
