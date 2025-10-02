import { useState, useEffect } from 'react';
import './App.css';
import './styles.css';

const API_ENDPOINT = import.meta.env.VITE_CHAINY_API ?? 'https://9qwxcajqf9.execute-api.ap-northeast-1.amazonaws.com';

// Language translations
const translations = {
  zh: {
    title: 'CHAINY',
    slogan: '秒縮網址，WAGMI 🚀',
    subtitle: '短網址生成器',
    inputLabel: '目標網址',
    inputPlaceholder: 'https://your-website.com',
    validLabel: '✓ 有效',
    buttonGenerate: '生成短網址',
    buttonGenerating: '生成中...',
    successLabel: '生成成功',
    buttonCopy: '複製',
    buttonCopied: '已複製',
    buttonTest: '測試',
    footer: 'Powered by Chainy'
  },
  en: {
    title: 'CHAINY',
    slogan: 'Instant Links, WAGMI 🚀',
    subtitle: 'URL Shortener',
    inputLabel: 'Target URL',
    inputPlaceholder: 'https://your-website.com',
    validLabel: '✓ Valid',
    buttonGenerate: 'Generate Short URL',
    buttonGenerating: 'Generating...',
    successLabel: 'Success',
    buttonCopy: 'Copy',
    buttonCopied: 'Copied',
    buttonTest: 'Test',
    footer: 'Powered by Chainy'
  }
};

function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [language, setLanguage] = useState('zh'); // Default to Chinese

  const t = translations[language]; // Get current language translations

  useEffect(() => {
    const urlPattern = /^https?:\/\/.+/;
    setIsValidUrl(urlPattern.test(url));
  }, [url]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidUrl) return;

    setError('');
    setResult(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_ENDPOINT}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: url }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to create short URL');
      }

      const data = await response.json();
      const shortUrl = (data.short_url ?? '').trim().length > 0 ? data.short_url : `${API_ENDPOINT}/${data.code}`;
      setResult({ ...data, shortUrl });
      setUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result.shortUrl);
    setCopied(true);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'rgb(2, 6, 23)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 16px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background gradient orbs */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '384px',
            height: '384px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '9999px',
            filter: 'blur(80px)',
            animation: 'float 6s ease-in-out infinite'
          }}
        ></div>
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            width: '384px',
            height: '384px',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            borderRadius: '9999px',
            filter: 'blur(80px)',
            animation: 'float 6s ease-in-out infinite',
            animationDelay: '-3s'
          }}
        ></div>
      </div>

      {/* Language toggle button */}
      <div
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 8px',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '999px',
          zIndex: 100,
          transition: 'all 0.3s ease'
        }}
      >
        <span style={{
          fontSize: '1rem',
          marginLeft: '4px',
          marginRight: '4px'
        }}>🌐</span>

        <button
          onClick={() => setLanguage('zh')}
          style={{
            padding: '6px 12px',
            backgroundColor: language === 'zh' ? 'rgba(59, 130, 246, 0.5)' : 'transparent',
            border: 'none',
            borderRadius: '999px',
            color: language === 'zh' ? 'rgb(255, 255, 255)' : 'rgb(148, 163, 184)',
            fontSize: '0.875rem',
            fontWeight: language === 'zh' ? '700' : '500',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            if (language !== 'zh') {
              e.target.style.color = 'rgb(203, 213, 225)';
            }
          }}
          onMouseLeave={(e) => {
            if (language !== 'zh') {
              e.target.style.color = 'rgb(148, 163, 184)';
            }
          }}
        >
          中文
        </button>

        <div style={{
          width: '1px',
          height: '16px',
          backgroundColor: 'rgba(148, 163, 184, 0.3)'
        }}></div>

        <button
          onClick={() => setLanguage('en')}
          style={{
            padding: '6px 12px',
            backgroundColor: language === 'en' ? 'rgba(59, 130, 246, 0.5)' : 'transparent',
            border: 'none',
            borderRadius: '999px',
            color: language === 'en' ? 'rgb(255, 255, 255)' : 'rgb(148, 163, 184)',
            fontSize: '0.875rem',
            fontWeight: language === 'en' ? '700' : '500',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            if (language !== 'en') {
              e.target.style.color = 'rgb(203, 213, 225)';
            }
          }}
          onMouseLeave={(e) => {
            if (language !== 'en') {
              e.target.style.color = 'rgb(148, 163, 184)';
            }
          }}
        >
          EN
        </button>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '640px'
        }}
      >
        {/* Title section */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '64px',
            animation: 'slideInUp 0.8s ease-out forwards'
          }}
        >
          <h1
            style={{
              fontSize: '4.5rem',
              fontWeight: '900',
              marginBottom: '16px',
              letterSpacing: '-0.025em',
              background: 'linear-gradient(to right, rgb(96, 165, 250), rgb(192, 132, 252), rgb(96, 165, 250))',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {t.title}
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: 'rgb(203, 213, 225)',
            marginBottom: '8px'
          }}>{t.slogan}</p>
          <p style={{
            color: 'rgb(100, 116, 139)',
            fontSize: '0.875rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>{t.subtitle}</p>
        </div>

        {/* Main card */}
        <div
          style={{
            position: 'relative',
            borderRadius: '24px',
            padding: '40px',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(51, 65, 85, 0.5)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'slideInUp 0.8s ease-out 0.2s forwards',
            transition: 'all 0.5s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(51, 65, 85, 0.5)';
          }}
        >
          {/* Top decorative line */}
          <div
            className="absolute top-0 left-1/4 right-1/4"
            style={{
              height: '1px',
              background: 'linear-gradient(to right, transparent, rgb(59, 130, 246), transparent)'
            }}
          ></div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Input field section */}
            <div>
              <div style={{
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <label style={{
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: 'rgb(148, 163, 184)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  {t.inputLabel}
                </label>
                {isValidUrl && url && (
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'rgb(52, 211, 153)',
                    fontFamily: 'monospace'
                  }}>{t.validLabel}</span>
                )}
              </div>

              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t.inputPlaceholder}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  border: '2px solid rgba(51, 65, 85, 0.5)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  fontSize: '16px',
                  color: 'white',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (document.activeElement !== e.target) {
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (document.activeElement !== e.target) {
                    e.target.style.borderColor = 'rgba(51, 65, 85, 0.5)';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgb(59, 130, 246)';
                  e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.15), 0 10px 25px rgba(59, 130, 246, 0.2)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(51, 65, 85, 0.5)';
                  e.target.style.boxShadow = 'none';
                  e.target.style.transform = 'translateY(0)';
                }}
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || !isValidUrl}
              style={{
                width: '100%',
                background: 'linear-gradient(to right, rgb(37, 99, 235), rgb(147, 51, 234))',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                border: 'none',
                cursor: isLoading || !isValidUrl ? 'not-allowed' : 'pointer',
                opacity: isLoading || !isValidUrl ? '0.4' : '1',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                if (!isLoading && isValidUrl) {
                  e.target.style.transform = 'scale(1.02)';
                  e.target.style.boxShadow = '0 10px 40px rgba(59, 130, 246, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = 'none';
              }}
              onMouseDown={(e) => {
                if (!isLoading && isValidUrl) {
                  e.target.style.transform = 'scale(0.98)';
                }
              }}
              onMouseUp={(e) => {
                if (!isLoading && isValidUrl) {
                  e.target.style.transform = 'scale(1.02)';
                }
              }}
            >
              {isLoading ? t.buttonGenerating : t.buttonGenerate}
            </button>

            {/* Error message */}
            {error && (
              <div
                style={{
                  borderRadius: '12px',
                  padding: '16px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  animation: 'fadeIn 0.6s ease-out forwards'
                }}
              >
                <p style={{
                  color: 'rgb(248, 113, 113)',
                  fontSize: '0.875rem'
                }}>{error}</p>
              </div>
            )}
          </form>

          {/* Result display */}
          {result && (
            <div
              style={{
                marginTop: '32px',
                paddingTop: '32px',
                borderTop: '1px solid rgba(51, 65, 85, 0.5)',
                animation: 'fadeIn 0.6s ease-out forwards'
              }}
            >
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '9999px',
                      backgroundColor: 'rgb(52, 211, 153)',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }}
                  ></div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    color: 'rgb(52, 211, 153)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>{t.successLabel}</span>
                </div>

                <div
                  style={{
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '16px',
                    backgroundColor: 'rgba(2, 6, 23, 0.8)'
                  }}
                >
                  <a
                    href={result.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'rgb(96, 165, 250)',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      wordBreak: 'break-all',
                      transition: 'color 0.2s ease',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = 'rgb(147, 197, 253)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = 'rgb(96, 165, 250)';
                    }}
                  >
                    {result.shortUrl}
                  </a>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px'
              }}>
                <button
                  onClick={handleCopy}
                  style={{
                    backgroundColor: 'rgb(5, 150, 105)',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.backgroundColor = 'rgb(16, 185, 129)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.backgroundColor = 'rgb(5, 150, 105)';
                  }}
                  onMouseDown={(e) => {
                    e.target.style.transform = 'scale(0.95)';
                  }}
                  onMouseUp={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                  }}
                >
                  {copied ? t.buttonCopied : t.buttonCopy}
                </button>

                <a
                  href={result.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: 'rgb(30, 41, 59)',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    textAlign: 'center',
                    textDecoration: 'none',
                    color: 'white',
                    display: 'block',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.backgroundColor = 'rgb(51, 65, 85)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.backgroundColor = 'rgb(30, 41, 59)';
                  }}
                  onMouseDown={(e) => {
                    e.target.style.transform = 'scale(0.95)';
                  }}
                  onMouseUp={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                  }}
                >
                  {t.buttonTest}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '32px',
            color: 'rgb(71, 85, 105)',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            animation: 'slideInUp 0.8s ease-out 0.4s forwards'
          }}
        >
          {t.footer}
        </div>
      </div>
    </div>
  );
}

export default App;
