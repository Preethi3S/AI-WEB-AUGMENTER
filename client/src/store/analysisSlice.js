import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { http } from '../api/http.js';

export const summarizePage = createAsyncThunk('analyses/summarize', async (payload) => {
  const { data } = await http.post('/ai/summaries', payload);
  return data.data;
});

export const askQuestion = createAsyncThunk('analyses/question', async (payload) => {
  const { data } = await http.post('/ai/questions', payload);
  return data.data;
});

export const matchResume = createAsyncThunk('analyses/match', async (payload) => {
  const { data } = await http.post('/ai/match-resume', payload);
  return data.data;
});

export const generateRoadmap = createAsyncThunk('analyses/roadmap', async (payload) => {
  const { data } = await http.post('/ai/roadmap', payload);
  return data.data;
});

const analysisSlice = createSlice({
  name: 'analyses',
  initialState: {
    current: null,
    status: 'idle',
    error: ''
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(summarizePage.pending, (state) => { state.status = 'loading'; })
      .addCase(askQuestion.pending, (state) => { state.status = 'loading'; })
      .addCase(matchResume.pending, (state) => { state.status = 'loading'; })
      .addCase(generateRoadmap.pending, (state) => { state.status = 'loading'; })
      .addCase(summarizePage.fulfilled, (state, action) => { state.status = 'succeeded'; state.current = action.payload.result; })
      .addCase(askQuestion.fulfilled, (state, action) => { state.status = 'succeeded'; state.current = action.payload.result; })
      .addCase(matchResume.fulfilled, (state, action) => { state.status = 'succeeded'; state.current = action.payload.result; })
      .addCase(generateRoadmap.fulfilled, (state, action) => { state.status = 'succeeded'; state.current = action.payload.result; })
      .addCase(summarizePage.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message || 'Analysis failed'; })
      .addCase(askQuestion.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message || 'Analysis failed'; })
      .addCase(matchResume.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message || 'Analysis failed'; })
      .addCase(generateRoadmap.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message || 'Analysis failed'; });
  }
});

export const selectAnalysis = (state) => state.analyses;
export default analysisSlice.reducer;