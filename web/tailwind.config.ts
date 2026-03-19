import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			technique: {
  				'path-tracing': 'hsl(var(--technique-path-tracing))',
  				'ray-tracing': 'hsl(var(--technique-ray-tracing))',
  				'rasterization': 'hsl(var(--technique-rasterization))',
  				'neural': 'hsl(var(--technique-neural))',
  				'gaussian-splatting': 'hsl(var(--technique-gaussian-splatting))',
  				'differentiable': 'hsl(var(--technique-differentiable))',
  				'volume': 'hsl(var(--technique-volume))',
  				'ray-marching': 'hsl(var(--technique-ray-marching))',
  				'educational': 'hsl(var(--technique-educational))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-inter)',
  				'system-ui',
  				'sans-serif'
  			],
  			mono: [
  				'var(--font-jetbrains-mono)',
  				'Consolas',
  				'monospace'
  			]
  		},
  		fontSize: {
  			'display-lg': [
  				'3.5rem',
  				{
  					lineHeight: '1.1',
  					letterSpacing: '-0.025em',
  					fontWeight: '700'
  				}
  			],
  			'display': [
  				'2.75rem',
  				{
  					lineHeight: '1.15',
  					letterSpacing: '-0.02em',
  					fontWeight: '700'
  				}
  			],
  			'display-sm': [
  				'2rem',
  				{
  					lineHeight: '1.2',
  					letterSpacing: '-0.015em',
  					fontWeight: '600'
  				}
  			]
  		},
  		keyframes: {
  			'fade-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(8px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'fade-out': {
  				'0%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				},
  				'100%': {
  					opacity: '0',
  					transform: 'translateY(8px)'
  				}
  			},
  			'slide-in-from-right': {
  				'0%': {
  					transform: 'translateX(100%)'
  				},
  				'100%': {
  					transform: 'translateX(0)'
  				}
  			},
  			'slide-out-to-right': {
  				'0%': {
  					transform: 'translateX(0)'
  				},
  				'100%': {
  					transform: 'translateX(100%)'
  				}
  			},
  			'glow-pulse': {
  				'0%, 100%': {
  					opacity: '0.4'
  				},
  				'50%': {
  					opacity: '0.8'
  				}
  			},
  			'ray-sweep-1': {
  				'0%': {
  					transform: 'translateX(-100%) rotate(-35deg)'
  				},
  				'100%': {
  					transform: 'translateX(200%) rotate(-35deg)'
  				}
  			},
  			'ray-sweep-2': {
  				'0%': {
  					transform: 'translateX(200%) rotate(-50deg)'
  				},
  				'100%': {
  					transform: 'translateX(-100%) rotate(-50deg)'
  				}
  			},
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'highlight-pulse': {
  				'0%, 100%': {
  					backgroundColor: 'hsl(var(--primary) / 0.12)'
  				},
  				'50%': {
  					backgroundColor: 'hsl(var(--primary) / 0.06)'
  				}
  			}
  		},
  		animation: {
  			'fade-in': 'fade-in 0.3s ease-out',
  			'fade-out': 'fade-out 0.3s ease-in',
  			'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
  			'slide-out-to-right': 'slide-out-to-right 0.3s ease-in',
  			'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
  			'ray-sweep-1': 'ray-sweep-1 30s linear infinite',
  			'ray-sweep-2': 'ray-sweep-2 45s linear infinite',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'highlight-pulse': 'highlight-pulse 1.5s ease-in-out 1'
  		},
  		maxWidth: {
  			'8xl': '90rem'
  		},
  		spacing: {
  			'18': '4.5rem',
  			'88': '22rem'
  		}
  	}
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
};

export default config;
