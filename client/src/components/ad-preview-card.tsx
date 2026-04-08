import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Check,
  ArrowRight,
} from "lucide-react";

interface AdPreviewCardProps {
  orgName: string;
  orgLogoUrl?: string | null;
  primaryColor: string;
  headline: string;
  subheadline: string;
  bulletPoints: string[];
  payDisplay: string;
  benefitsDisplay: string[];
  cta?: string;
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function OrgAvatar({
  orgName,
  orgLogoUrl,
  primaryColor,
  size = 40,
}: {
  orgName: string;
  orgLogoUrl?: string | null;
  primaryColor: string;
  size?: number;
}) {
  if (orgLogoUrl) {
    return (
      <img
        src={orgLogoUrl}
        alt={orgName}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  const initial = orgName.charAt(0).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold"
      style={{
        width: size,
        height: size,
        backgroundColor: primaryColor,
        fontSize: size * 0.45,
      }}
    >
      {initial}
    </div>
  );
}

export function AdPreviewCard({
  orgName,
  orgLogoUrl,
  primaryColor,
  headline,
  subheadline,
  bulletPoints,
  payDisplay,
  benefitsDisplay,
  cta = "Apply Now",
}: AdPreviewCardProps) {
  const rgb = hexToRgb(primaryColor);

  // Split headline into "HIRING" prefix and the job title
  const headlineUpper = headline.toUpperCase();
  const jobTitle = headlineUpper.startsWith("HIRING ")
    ? headlineUpper.slice(7)
    : headlineUpper;
  const showHiringPrefix = headlineUpper.startsWith("HIRING ");

  return (
    <div className="w-full max-w-[420px] rounded-xl bg-white shadow-lg border border-gray-200 overflow-hidden font-sans">
      {/* Header: org info + sponsored */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <OrgAvatar
            orgName={orgName}
            orgLogoUrl={orgLogoUrl}
            primaryColor={primaryColor}
            size={40}
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-900">{orgName}</p>
            <p className="text-xs text-gray-500">
              Sponsored · <span className="text-gray-400">🌐</span>
            </p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 p-1">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Main creative area */}
      <div
        className="relative px-6 py-8"
        style={{
          background: `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12) 100%)`,
        }}
      >
        {/* Subtle decorative accent line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: primaryColor }}
        />

        {/* Org logo watermark in top-right */}
        <div className="absolute top-4 right-4 opacity-15">
          <OrgAvatar
            orgName={orgName}
            orgLogoUrl={orgLogoUrl}
            primaryColor={primaryColor}
            size={56}
          />
        </div>

        {/* Headline area */}
        <div className="relative z-10 mb-5">
          {showHiringPrefix && (
            <p
              className="text-xs font-bold tracking-[0.2em] uppercase mb-1"
              style={{ color: primaryColor }}
            >
              Hiring
            </p>
          )}
          <h2
            className="text-2xl font-extrabold leading-tight tracking-tight"
            style={{ color: primaryColor }}
          >
            {showHiringPrefix ? jobTitle : headlineUpper}
          </h2>
        </div>

        {/* Subheadline */}
        <p className="text-sm text-gray-600 mb-5 font-medium">{subheadline}</p>

        {/* Bullet points / requirements */}
        {bulletPoints.length > 0 && (
          <div className="space-y-2 mb-6">
            {bulletPoints.map((point, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
                  }}
                >
                  <Check
                    size={12}
                    strokeWidth={3}
                    style={{ color: primaryColor }}
                  />
                </span>
                <span className="text-sm text-gray-700">{point}</span>
              </div>
            ))}
          </div>
        )}

        {/* Pay display button */}
        <div
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-white font-bold text-lg shadow-md"
          style={{
            backgroundColor: primaryColor,
            boxShadow: `0 4px 14px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`,
          }}
        >
          {payDisplay}
        </div>

        {/* Benefits */}
        {benefitsDisplay.length > 0 && (
          <div className="flex items-center gap-2 mt-5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Benefits
            </span>
            {benefitsDisplay.map((benefit, i) => (
              <span
                key={i}
                className="text-xs font-medium px-2.5 py-1 rounded-full border"
                style={{
                  borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
                  color: primaryColor,
                  backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06)`,
                }}
              >
                {benefit}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* CTA bar */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
        <div className="leading-tight">
          <p className="text-xs text-gray-500 truncate max-w-[180px]">
            {orgName.toLowerCase().replace(/\s+/g, "")}.com
          </p>
          <p className="text-sm font-semibold text-gray-900">{cta}</p>
        </div>
        <div
          className="flex items-center justify-center w-9 h-9 rounded-full"
          style={{
            backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
          }}
        >
          <ArrowRight size={16} style={{ color: primaryColor }} />
        </div>
      </div>

      {/* Reactions bar */}
      <div className="px-4 py-2 border-t border-gray-100">
        {/* Reaction emoji row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span className="flex -space-x-1 text-xs">
              <span className="w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center">
                <Heart size={10} className="text-white fill-white" />
              </span>
              <span className="w-[18px] h-[18px] rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px]">
                👍
              </span>
            </span>
            <span className="text-xs text-gray-500 ml-1.5">44.6K</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>619 comments</span>
            <span>2,296 shares</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-around border-t border-gray-100 pt-2">
          <button className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm font-medium py-1.5 px-3 rounded-md hover:bg-gray-100 transition-colors">
            <Heart size={16} />
            <span>Like</span>
          </button>
          <button className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm font-medium py-1.5 px-3 rounded-md hover:bg-gray-100 transition-colors">
            <MessageCircle size={16} />
            <span>Comment</span>
          </button>
          <button className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm font-medium py-1.5 px-3 rounded-md hover:bg-gray-100 transition-colors">
            <Share2 size={16} />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}
