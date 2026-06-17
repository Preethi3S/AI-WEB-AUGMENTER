import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../../utils/api.js';

const initialState = {
  metrics: null,
  loading: false,
  error: ''
};

export const fetchOverview = createAsyncThunk('dashboard/fetchOverview', async () => {
  const { data } = await api.get('/dashboard/overview');
  return data.data.metrics;
});

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOverview.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.metrics = action.payload;
      })
      .addCase(fetchOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Unable to load dashboard';
      });
  }
});

export default dashboardSlice.reducer;