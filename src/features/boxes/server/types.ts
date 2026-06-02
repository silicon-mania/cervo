export type CreateBoxActionState = {
  status: 'idle' | 'success' | 'error';
  error: string | null;
  box: {
    id: string;
    name: string;
    slug: string;
    status: 'active' | 'future' | 'archived';
    parentBoxId: string | null;
    homeDocumentId: string | null;
  } | null;
};

export const initialCreateBoxActionState: CreateBoxActionState = {
  status: 'idle',
  error: null,
  box: null,
};
