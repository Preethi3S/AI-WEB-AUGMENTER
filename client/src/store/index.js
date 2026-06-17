import { configureStore } from '@reduxjs/toolkit';
import analysesReducer from './slices/analysisSlice.js';
import authReducer from './slices/authSlice.js';
import dashboardReducer from './slices/dashboardSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    analyses: analysesReducer,
    dashboard: dashboardReducer
  }
});