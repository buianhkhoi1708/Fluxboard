import axiosClient from '../../../lib/axiosClient';

export const aiApi = {
generateBoard: (payload) => {
  return axiosClient.post(`/ai/generate-new-board`, payload);
},
};
