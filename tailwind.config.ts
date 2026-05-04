import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ax: {
          header:        '#040939',
          primary:       '#0E567B',
          'primary-dark':'#050B49',
          'primary-light':'#90C0E7',
          accent:        '#4BA2FF',
          aqua:          '#00E3FF',
          'aqua-gray':   '#7EC6DE',
          text:          '#181934',
          'text-light':  '#4A4A68',
          bg:            '#FFFFFF',
          'bg-alt':      '#F8F9FA',
          'bg-neutral':  '#E6E6E6',
          border:        '#D3DCDF',
          error:         '#C0062B',
          warning:       '#FFD600',
          success:       '#4BA2FF',
        },
      },
      fontFamily: {
        sans: ['Roboto', 'SF Pro Display', 'Helvetica', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tight: '-0.3px',
        tighter: '-0.6px',
      },
      fontSize: {
        'h1': ['40px', { lineHeight: '40px', letterSpacing: '-0.6px', fontWeight: '700' }],
        'h2': ['32px', { lineHeight: '32px', letterSpacing: '-0.6px', fontWeight: '700' }],
        'h3': ['28px', { lineHeight: '30px', letterSpacing: '-0.6px', fontWeight: '700' }],
        'h4': ['24px', { lineHeight: '26px', letterSpacing: '-0.45px', fontWeight: '700' }],
        'h5': ['20px', { lineHeight: '24px', letterSpacing: '-0.38px', fontWeight: '700' }],
        'h6': ['18px', { lineHeight: '23px', letterSpacing: '-0.3px', fontWeight: '700' }],
        'body': ['16px', { lineHeight: '22px', letterSpacing: '-0.3px' }],
        'sm-ax': ['14px', { lineHeight: '18px', letterSpacing: '-0.2px' }],
        'xs-ax': ['12px', { lineHeight: '16px', letterSpacing: '-0.17px' }],
      },
      borderRadius: {
        card: '8px',
        badge: '4px',
        pill: '20px',
      },
    },
  },
  plugins: [],
}

export default config
