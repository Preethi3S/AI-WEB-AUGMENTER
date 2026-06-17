import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../../utils/api.js';

const initialState = {
  summaries: [],
  saved: { analyses: [], resumes: [], jobs: [], interviews: [], roadmaps: [], notes: [] },
  loading: false,
  error: ''
};

export const fetchSavedResults = createAsyncThunk('analyses/fetchSavedResults', async () => {
  const { data } = await api.get('/ai/saved');
  return data.data;
});

const analysisSlice = createSlice({
  name: 'analyses',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSavedResults.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSavedResults.fulfilled, (state, action) => {
        state.loading = false;
        state.saved = action.payload;
      })
      .addCase(fetchSavedResults.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Unable to load saved results';
      });
  }
});

export default analysisSlice.reducer;