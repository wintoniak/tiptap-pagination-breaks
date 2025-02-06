import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Node } from 'prosemirror-model';

export interface PaginationOptions {
  pageHeight: number;
  pageWidth: number;
  pageMargin: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pagination: {
      setPaginationOptions: (options: Partial<PaginationOptions>) => ReturnType;
    };
  }
}

export const Pagination = Extension.create<PaginationOptions>({
  name: 'pagination',

  addOptions() {
    return {
      pageHeight: 1056, // default height of the page
      pageWidth: 816, // default width of the page
      pageMargin: 96, // Default margin
    };
  },

  addCommands() {
    return {
      setPaginationOptions:
        (options: Partial<PaginationOptions>) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta('paginationOptions', options);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('pagination');

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init: () => ({ ...this.options }),
          apply: (tr, value) => {
            const newOptions = tr.getMeta('paginationOptions');
            return newOptions ? { ...value, ...newOptions } : value;
          },
        },
        props: {
          decorations: (state) => {
            const { doc } = state;
            const decorations: Decoration[] = [];
            let currentPageHeight = 0;

            const options = pluginKey.getState(state);
            const { pageHeight, pageMargin } = options;

            doc.descendants((node: Node, pos: number) => {
              // Calculate node height (more robust method)
              const nodeDOM = this.editor.view.nodeDOM(pos);
              const nodeHeight =
                node.isBlock && nodeDOM instanceof HTMLElement
                  ? nodeDOM.offsetHeight
                  : 0;

              // Check if current page is full
              if (
                currentPageHeight + nodeHeight >
                pageHeight - 2 * pageMargin
              ) {
                // Insert page break decoration
                decorations.push(
                  Decoration.widget(pos, () => {
                    const pageBreak = document.createElement('div');
                    pageBreak.className = 'page-break';
                    pageBreak.style.height = '20px';
                    pageBreak.style.width = '100%';
                    pageBreak.style.borderTop = '1px dashed #ccc';
                    pageBreak.style.marginTop = '10px';
                    pageBreak.style.marginBottom = '10px';
                    pageBreak.setAttribute('data-page-break', 'true');
                    return pageBreak;
                  })
                );

                // Reset page height
                currentPageHeight = 0;
              }

              // Accumulate page height
              currentPageHeight += nodeHeight;
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          class: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute('class'),
            renderHTML: (attributes) =>
              attributes.class ? { class: attributes.class } : {},
          },
        },
      },
    ];
  },
});
