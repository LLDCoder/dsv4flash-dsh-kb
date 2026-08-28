const state = {
  applicationId: null,
  type: null,
};

const setUpdateForm = (payload) => {
  if (payload.applicationId !== undefined) {
    state.applicationId = payload.applicationId;
  }
  if (payload.type !== undefined) {
    state.type = payload.type;
  }
};

const resetUpdateForm = () => {
  state.applicationId = null;
  state.type = null;
};

export const useUpdateFormStore = {
  getState: () => ({
    ...state,
    setUpdateForm,
    resetUpdateForm,
  }),
};
