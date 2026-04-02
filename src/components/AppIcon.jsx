export default function AppIcon({ name, className = "" }) {
  const iconProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": "true",
  };

  switch (name) {
    case "logo":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="10.5" fill="url(#finvistaGlow)" fillOpacity="0.16" />
          <path
            d="M12 3.5 14 6.7l3.8.3-1.9 3.2 1.9 3.1-3.8.3-2 3.2-2-3.2-3.8-.3 1.9-3.1L6.2 7l3.8-.3 2-3.2Z"
            stroke="url(#finvistaGradient)"
            strokeWidth="1.8"
          />
          <path
            d="M9.3 9.1c.8-.8 1.8-1.2 2.7-1.2 2.5 0 4.4 1.8 4.4 4.1 0 2.4-1.9 4.1-4.4 4.1-.9 0-1.9-.4-2.7-1.1"
            stroke="url(#finvistaGradient)"
            strokeWidth="1.8"
          />
          <path d="M8.2 12H15" stroke="url(#finvistaGradient)" strokeWidth="1.8" strokeLinecap="round" />
          <defs>
            <linearGradient id="finvistaGradient" x1="5" y1="5" x2="19" y2="19">
              <stop stopColor="#ff58d0" />
              <stop offset="1" stopColor="#5d8dff" />
            </linearGradient>
            <radialGradient id="finvistaGlow" cx="0" cy="0" r="1" gradientTransform="translate(12 12) rotate(90) scale(10.5)">
              <stop stopColor="#a855f7" />
              <stop offset="1" stopColor="#1d4ed8" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      );
    case "dashboard":
      return (
        <svg {...iconProps}>
          <rect x="4" y="4" width="7" height="7" rx="1.6" />
          <rect x="13" y="4" width="7" height="7" rx="1.6" />
          <rect x="4" y="13" width="7" height="7" rx="1.6" />
          <rect x="13" y="13" width="7" height="7" rx="1.6" />
        </svg>
      );
    case "transactions":
      return (
        <svg {...iconProps}>
          <path d="M5 8h12" />
          <path d="M13 5 17 8l-4 3" />
          <path d="M19 16H7" />
          <path d="M11 13 7 16l4 3" />
        </svg>
      );
    case "analytics":
      return (
        <svg {...iconProps}>
          <path d="M5 19V9" />
          <path d="M12 19V5" />
          <path d="M19 19v-7" />
          <path d="M4 19h16" />
        </svg>
      );
    case "budgets":
      return (
        <svg {...iconProps}>
          <path d="M4 8.5c0-1.4 1.1-2.5 2.5-2.5h10.3c1.8 0 3.2 1.4 3.2 3.2v6.3c0 1.4-1.1 2.5-2.5 2.5H7.2A3.2 3.2 0 0 1 4 14.8V8.5Z" />
          <path d="M16 12h3.5" />
          <path d="M7 6V4.8c0-.5.3-.9.8-1l8.3-1.3" />
        </svg>
      );
    case "goals":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="3.4" />
          <path d="m17 7 2.5-2.5" />
        </svg>
      );
    case "reports":
      return (
        <svg {...iconProps}>
          <path d="M7 4h7l5 5v10.5A1.5 1.5 0 0 1 17.5 21h-10A1.5 1.5 0 0 1 6 19.5v-14A1.5 1.5 0 0 1 7.5 4Z" />
          <path d="M14 4v5h5" />
          <path d="M9 13h6" />
          <path d="M9 17h4" />
        </svg>
      );
    case "settings":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1l-.3-2.6h-4l-.3 2.6c-.6.2-1.2.6-1.7 1l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1c.5.4 1.1.8 1.7 1l.3 2.6h4l.3-2.6c.6-.2 1.2-.6 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" />
        </svg>
      );
    case "menu":
      return (
        <svg {...iconProps}>
          <path d="M4 7.5h16" />
          <path d="M4 12h16" />
          <path d="M4 16.5h16" />
        </svg>
      );
    case "close":
      return (
        <svg {...iconProps}>
          <path d="m6 6 12 12" />
          <path d="M18 6 6 18" />
        </svg>
      );
    case "notification":
      return (
        <svg {...iconProps}>
          <path d="M7 10a5 5 0 1 1 10 0v3.4l1.5 2.3H5.5L7 13.4V10Z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...iconProps}>
          <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
          <path d="M8 3.5v4" />
          <path d="M16 3.5v4" />
          <path d="M3.5 9.5h17" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...iconProps}>
          <path d="m7 10 5 5 5-5" />
        </svg>
      );
    case "viewer":
      return (
        <svg {...iconProps}>
          <path d="M2.5 12s3.4-5.5 9.5-5.5S21.5 12 21.5 12 18.1 17.5 12 17.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "admin":
      return (
        <svg {...iconProps}>
          <path d="M12 3 5.5 5.8v4.3c0 4 2.7 7.7 6.5 8.9 3.8-1.2 6.5-4.9 6.5-8.9V5.8L12 3Z" />
          <path d="m9.5 12 1.7 1.7 3.3-3.7" />
        </svg>
      );
    case "avatar":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 20c1.4-3.6 4-5.4 7-5.4s5.6 1.8 7 5.4" />
        </svg>
      );
    case "balance":
      return (
        <svg {...iconProps}>
          <rect x="4" y="6" width="16" height="12" rx="3" />
          <path d="M4 10h16" />
          <path d="M9 14h2" />
        </svg>
      );
    case "income":
      return (
        <svg {...iconProps}>
          <rect x="6" y="4" width="12" height="16" rx="3" />
          <path d="M12 8v8" />
          <path d="m9.5 10.5 2.5-2.5 2.5 2.5" />
        </svg>
      );
    case "expense":
      return (
        <svg {...iconProps}>
          <path d="M4 10.5 12 4l8 6.5" />
          <path d="M6.5 9.5V20h11V9.5" />
          <path d="M10 14h4" />
        </svg>
      );
    case "savings":
      return (
        <svg {...iconProps}>
          <rect x="4.5" y="6.5" width="15" height="13" rx="3" />
          <path d="M8.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 5v1.5" />
          <path d="M4.5 11.5h15" />
        </svg>
      );
    case "plus":
      return (
        <svg {...iconProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "download":
      return (
        <svg {...iconProps}>
          <path d="M12 4v10" />
          <path d="m8.5 10.5 3.5 3.5 3.5-3.5" />
          <path d="M5 19h14" />
        </svg>
      );
    case "upload":
      return (
        <svg {...iconProps}>
          <path d="M12 20V10" />
          <path d="m8.5 13.5 3.5-3.5 3.5 3.5" />
          <path d="M5 5h14" />
        </svg>
      );
    case "import":
      return (
        <svg {...iconProps}>
          <path d="M12 4v10" />
          <path d="m15.5 7.5-3.5-3.5-3.5 3.5" />
          <path d="M5 19h14" />
        </svg>
      );
    case "swap":
      return (
        <svg {...iconProps}>
          <path d="M7 7h10" />
          <path d="m13 3 4 4-4 4" />
          <path d="M17 17H7" />
          <path d="m11 13-4 4 4 4" />
        </svg>
      );
    case "search":
      return (
        <svg {...iconProps}>
          <circle cx="11" cy="11" r="5.5" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case "filter":
      return (
        <svg {...iconProps}>
          <path d="M4 6h16" />
          <path d="M7 12h10" />
          <path d="M10 18h4" />
        </svg>
      );
    case "sort":
      return (
        <svg {...iconProps}>
          <path d="M8 6h9" />
          <path d="M8 12h6" />
          <path d="M8 18h3" />
          <path d="m5 4 2 2-2 2" />
        </svg>
      );
    case "edit":
      return (
        <svg {...iconProps}>
          <path d="m4 20 4.5-1L19 8.5 15.5 5 5 15.5 4 20Z" />
          <path d="m13.5 7 3.5 3.5" />
        </svg>
      );
    case "trash":
      return (
        <svg {...iconProps}>
          <path d="M5 7h14" />
          <path d="M9 7V5.5h6V7" />
          <path d="M8 7v11a1.5 1.5 0 0 0 1.5 1.5h5A1.5 1.5 0 0 0 16 18V7" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      );
    case "spark":
      return (
        <svg {...iconProps}>
          <path d="M12 3v4" />
          <path d="M12 17v4" />
          <path d="M4.5 12h4" />
          <path d="M15.5 12h4" />
          <path d="m6.5 6.5 2.8 2.8" />
          <path d="m14.7 14.7 2.8 2.8" />
          <path d="m17.5 6.5-2.8 2.8" />
          <path d="m9.3 14.7-2.8 2.8" />
        </svg>
      );
    case "insight":
      return (
        <svg {...iconProps}>
          <path d="M12 4a6 6 0 0 0-3.7 10.7c.7.6 1.2 1.4 1.2 2.3h4.9c0-.9.4-1.7 1.1-2.3A6 6 0 0 0 12 4Z" />
          <path d="M10 20h4" />
        </svg>
      );
    case "moon":
      return (
        <svg {...iconProps}>
          <path d="M18 14.5A7 7 0 0 1 9.5 6a7.5 7.5 0 1 0 8.5 8.5Z" />
        </svg>
      );
    case "sun":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.2" />
          <path d="M12 19.3v2.2" />
          <path d="m5.3 5.3 1.6 1.6" />
          <path d="m17.1 17.1 1.6 1.6" />
          <path d="M2.5 12h2.2" />
          <path d="M19.3 12h2.2" />
          <path d="m5.3 18.7 1.6-1.6" />
          <path d="m17.1 6.9 1.6-1.6" />
        </svg>
      );
    case "home":
      return (
        <svg {...iconProps}>
          <path d="M4.5 10 12 4l7.5 6v9H4.5v-9Z" />
          <path d="M9 19v-5.5h6V19" />
        </svg>
      );
    case "food":
      return (
        <svg {...iconProps}>
          <path d="M7 4v8" />
          <path d="M10 4v8" />
          <path d="M7 8h3" />
          <path d="M15 4c-1.2 1.1-2 3-2 5.2V20" />
        </svg>
      );
    case "transport":
      return (
        <svg {...iconProps}>
          <rect x="5" y="6" width="14" height="10" rx="2.5" />
          <path d="M8 16v2.5" />
          <path d="M16 16v2.5" />
          <path d="M5 11h14" />
          <circle cx="8.5" cy="13.2" r=".7" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="13.2" r=".7" fill="currentColor" stroke="none" />
        </svg>
      );
    case "shopping":
      return (
        <svg {...iconProps}>
          <path d="M6.5 8.5h11l-1 10h-9l-1-10Z" />
          <path d="M9 8.5V7a3 3 0 1 1 6 0v1.5" />
        </svg>
      );
    case "bills":
      return (
        <svg {...iconProps}>
          <path d="M7 4.5h10v15l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5v-15Z" />
          <path d="M9 9h6" />
          <path d="M9 12.5h5" />
        </svg>
      );
    case "entertainment":
      return (
        <svg {...iconProps}>
          <path d="M5 8.5h14v7H5v-7Z" />
          <path d="M8 8.5v7" />
          <path d="M16 8.5v7" />
          <path d="M5 11.5h3" />
          <path d="M16 11.5h3" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...iconProps}>
          <rect x="4.5" y="7" width="15" height="11" rx="2.2" />
          <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
          <path d="M4.5 11.5h15" />
        </svg>
      );
    case "activity":
      return (
        <svg {...iconProps}>
          <path d="M4 16h3l2-5 3 8 2-5h6" />
        </svg>
      );
    case "help":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 1 1 4.7 1.2c-.5.8-1.2 1.2-1.7 1.7-.4.3-.5.7-.5 1.1v.5" />
          <path d="M12 17h.01" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
