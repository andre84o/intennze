import { leadSourceLabels } from "@/types/database";

interface Props {
  source: string | null;
  size?: number;
  className?: string;
}

const FacebookIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const GoogleAdsIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
  </svg>
);

const LinkedInIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const InstagramIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeLinecap="round" />
  </svg>
);

const XmlImportIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6M3 7l2-2h14l2 2v14l-2 2H5l-2-2V7z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v4H3" />
  </svg>
);

const ReferralIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m10-4a4 4 0 11-8 0 4 4 0 018 0zm6 4a3 3 0 11-6 0 3 3 0 016 0zM7 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

function renderIcon(source: string, size: number) {
  switch (source) {
    case "facebook_ads":
      return <FacebookIcon size={size} />;
    case "google_ads":
      return <GoogleAdsIcon size={size} />;
    case "linkedin":
      return <LinkedInIcon size={size} />;
    case "instagram":
      return <InstagramIcon size={size} />;
    case "xml_import":
    case "csv_import":
    case "xlsx_import":
      return <XmlImportIcon size={size} />;
    case "website":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/favicon20.png" width={size} height={size} alt="" className="object-contain rounded-sm" />
      );
    case "referral":
      return <ReferralIcon size={size} />;
    default:
      return null;
  }
}

export function LeadSourceIcon({ source, size = 16, className = "" }: Props) {
  if (!source) return null;
  const icon = renderIcon(source, size);
  if (!icon) return null;
  const label = leadSourceLabels[source as keyof typeof leadSourceLabels] || source;
  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center flex-shrink-0 ${className}`}
    >
      {icon}
    </span>
  );
}
