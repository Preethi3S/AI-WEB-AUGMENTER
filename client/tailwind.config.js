export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B1020',
        panel: '#111936',
        panelSoft: '#17203D',
        accent: '#7C8CF8',
        accent2: '#5EEAD4',
        warm: '#F59E0B'
      },
      boxShadow: {
        glow: '0 24px 80px rgba(92, 108, 255, 0.25)'
      },
      backgroundImage: {
        mesh: 'radial-gradient(circle at top left, rgba(124,140,248,0.30), transparent 30%), radial-gradient(circle at top right, rgba(94,234,212,0.18), transparent 24%), linear-gradient(180deg, #08101F 0%, #0B1020 100%)'
      }
    }
  },
  plugins: []
};