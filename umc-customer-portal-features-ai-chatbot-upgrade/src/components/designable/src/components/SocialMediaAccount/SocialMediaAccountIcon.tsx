import * as React from "react";
import facebookIcon from "@/assets/icons/social-media/facebook.svg";
import xIcon from "@/assets/icons/social-media/x.svg";
import instagramIcon from "@/assets/icons/social-media/instagram.svg";
import tiktokIcon from "@/assets/icons/social-media/tiktok.svg";
import youtubeIcon from "@/assets/icons/social-media/youtube.svg";
import snapchatIcon from "@/assets/icons/social-media/snapchat.svg";
import linkedinIcon from "@/assets/icons/social-media/linkedin.svg";
import applePodcastIcon from "@/assets/icons/social-media/apple-podcast.svg";
import appStoreIcon from "@/assets/icons/social-media/app-store.svg";
import googlePlayIcon from "@/assets/icons/social-media/google-play.svg";
import spotifyIcon from "@/assets/icons/social-media/spotify.svg";
import othersIcon from "@/assets/icons/social-media/others.svg";
import websiteIcon from "@/assets/icons/social-media/website.svg";

// Icons are keyed by the stable SocialMedias lookup Id, not by name. The backend
// localizes NameEn/NameAr to the current UI language (in Arabic, NameEn also holds
// Arabic text), so a name-based lookup silently misses and falls back to the
// generic icon in Arabic. The Id is language-independent, so it stays correct.
const SOCIAL_MEDIA_ICON_BY_ID: Record<string, string> = {
  "1": websiteIcon, // Website
  "2": appStoreIcon, // Mobile Application - Apple Store
  "3": googlePlayIcon, // Mobile Application - Play Store
  "4": facebookIcon, // Facebook
  "5": xIcon, // X
  "6": instagramIcon, // Instagram
  "7": youtubeIcon, // YouTube
  "8": snapchatIcon, // Snapchat
  "9": linkedinIcon, // LinkedIn
  "10": tiktokIcon, // Tiktok
  "11": spotifyIcon, // Spotify
  "12": applePodcastIcon, // Apple Podcast
  "13": othersIcon, // Others
};

type SocialMediaAccountIconProps = {
  typeId?: string | number | null;
  className?: string;
};

export const SocialMediaAccountIcon: React.FC<SocialMediaAccountIconProps> = ({
  typeId,
  className = "social-media-account__icon-image",
}) => {
  const icon = SOCIAL_MEDIA_ICON_BY_ID[String(typeId ?? "").trim()] ?? othersIcon;

  return (
    <img
      className={className}
      src={icon}
      alt=""
    />
  );
};
