import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../../utils/api.js';

const initialState = {
  token: localStorage.getItem('awt_token') || '',
  user: JSON.parse(localStorage.getItem('awt_user') || 'null'),
  status: 'idle',
  error: ''
};

export const loginUser = createAsyncThunk('auth/loginUser', async (payload) => {
  const { data } = await api.post('/auth/login', payload);
  return data.data;
});

export const registerUser = createAsyncThunk('auth/registerUser', async (payload) => {
  const { data } = await api.post('/auth/register', payload);
  return data.data;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.token = '';
      state.user = null;
      localStorage.removeItem('awt_token');
      localStorage.removeItem('awt_user');
    },
    restoreSession(state) {
      state.token = localStorage.getItem('awt_token') || '';
      state.user = JSON.parse(localStorage.getItem('awt_user') || 'null');
    }
  },
  extraReducers: (builder) => {
    const handleAuthSuccess = (state, action) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.status = 'succeeded';
      state.error = '';
      localStorage.setItem('awt_token', action.payload.token);
      localStorage.setItem('awt_user', JSON.stringify(action.payload.user));
    };

    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loginUser.fulfilled, handleAuthSuccess)
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Login failed';
      })
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(registerUser.fulfilled, handleAuthSuccess)
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Registration failed';
      });
  }
});

export const { logout, restoreSession } = authSlice.actions;
export default authSlice.reducer;