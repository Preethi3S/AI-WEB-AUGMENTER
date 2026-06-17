import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { http } from '../api/http.js';

const initialState = {
  token: localStorage.getItem('aiwa_token') || '',
  user: JSON.parse(localStorage.getItem('aiwa_user') || 'null'),
  status: 'idle',
  error: ''
};

export const loginUser = createAsyncThunk('auth/login', async (credentials) => {
  const { data } = await http.post('/auth/login', credentials);
  return data.data;
});

export const registerUser = createAsyncThunk('auth/register', async (credentials) => {
  const { data } = await http.post('/auth/register', credentials);
  return data.data;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.token = '';
      state.user = null;
      localStorage.removeItem('aiwa_token');
      localStorage.removeItem('aiwa_user');
    },
    hydrateAuth(state) {
      state.token = localStorage.getItem('aiwa_token') || '';
      state.user = JSON.parse(localStorage.getItem('aiwa_user') || 'null');
    }
  },
  extraReducers: (builder) => {
    const handleAuth = (builderCase) => {
      builderCase
        .addCase(loginUser.pending, (state) => {
          state.status = 'loading';
          state.error = '';
        })
        .addCase(registerUser.pending, (state) => {
          state.status = 'loading';
          state.error = '';
        })
        .addCase(loginUser.fulfilled, (state, action) => {
          state.status = 'succeeded';
          state.token = action.payload.token;
          state.user = action.payload.user;
          localStorage.setItem('aiwa_token', action.payload.token);
          localStorage.setItem('aiwa_user', JSON.stringify(action.payload.user));
        })
        .addCase(registerUser.fulfilled, (state, action) => {
          state.status = 'succeeded';
          state.token = action.payload.token;
          state.user = action.payload.user;
          localStorage.setItem('aiwa_token', action.payload.token);
          localStorage.setItem('aiwa_user', JSON.stringify(action.payload.user));
        })
        .addCase(loginUser.rejected, (state, action) => {
          state.status = 'failed';
          state.error = action.error.message || 'Unable to log in';
        })
        .addCase(registerUser.rejected, (state, action) => {
          state.status = 'failed';
          state.error = action.error.message || 'Unable to register';
        });
    };

    handleAuth(builder);
  }
});

export const { logout, hydrateAuth } = authSlice.actions;
export const selectAuthToken = (state) => state.auth.token;
export const selectAuthUser = (state) => state.auth.user;
export const selectAuthState = (state) => state.auth;
export default authSlice.reducer;