import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { http } from '../api/http.js';

export const fetchDashboard = createAsyncThunk('dashboard/fetch', async () => {
  const { data } = await http.get('/dashboard/overview');
  return data.data.metrics;
});

export const searchSaved = createAsyncThunk('dashboard/search', async (query) => {
  const { data } = await http.get('/dashboard/search', { params: { q: query } });
  return data.data.results;
});

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    metrics: null,
    searchResults: null,
    status: 'idle',
    error: ''
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.metrics = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load dashboard';
      })
      .addCase(searchSaved.fulfilled, (state, action) => {
        state.searchResults = action.payload;
      });
  }
});

export const selectDashboard = (state) => state.dashboard;
export default dashboardSlice.reducer;