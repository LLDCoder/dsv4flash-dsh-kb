import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type GoogleLatLngLiteral = {
  lat: number;
  lng: number;
};

type GoogleLatLng = {
  lat: () => number;
  lng: () => number;
};

type GoogleMapMouseEvent = {
  latLng: GoogleLatLng | null;
};

type GoogleGeocoderRequest = {
  location?: GoogleLatLngLiteral;
  address?: string;
  /** Locale of the returned names; defaults to the language the SDK was loaded with. */
  language?: string;
};

type GoogleGeocoderResult = {
  formatted_address: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  geometry?: {
    location?: GoogleLatLng;
  };
};

type GoogleMapInstance = {
  addListener: (eventName: string, handler: (event: GoogleMapMouseEvent) => void) => void;
  setCenter: (position: GoogleLatLngLiteral) => void;
  setZoom: (zoom: number) => void;
};

type GoogleMarkerInstance = {
  setMap: (map: GoogleMapInstance | null) => void;
  setPosition: (position: GoogleLatLngLiteral) => void;
};

type GoogleMapsApi = {
  maps: {
    Map: new (
      element: HTMLElement,
      options: {
        center: GoogleLatLngLiteral;
        zoom: number;
        clickableIcons?: boolean;
        fullscreenControl?: boolean;
        mapTypeControl?: boolean;
        streetViewControl?: boolean;
      }
    ) => GoogleMapInstance;
    Marker: new (options: {
      map: GoogleMapInstance;
      position: GoogleLatLngLiteral;
    }) => GoogleMarkerInstance;
    Geocoder: new () => {
      geocode: (
        request: GoogleGeocoderRequest,
        callback: (results: GoogleGeocoderResult[] | null, status: string) => void
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleMapsApi;
    __googleMapsInitMapPicker__?: () => void;
    gm_authFailure?: () => void;
  }
}

type GoogleMapPickerProps = {
  value?: string;
  centerAddress?: string;
  interactive?: boolean;
  latitude?: number;
  longitude?: number;
  onLocationSelect: (payload: {
    address?: string;
    /**
     * administrative_area_level_1, always resolved in GEOCODER_RESULT_LANGUAGE
     * regardless of the UI language. Callers matching it against a localized
     * lookup list must go through findMatchingEmirate, never compare it directly.
     */
    emirateName?: string;
    latitude: number;
    longitude: number;
  }) => boolean | void;
};

type GoogleMapError =
  | "configurationMissing"
  | "loadFailed"
  | "resolveAddressFailed";

// Always load Google Maps UI (labels, controls, geocoder formatting) in English.
const GOOGLE_MAPS_UI_LANGUAGE = "en";
/**
 * Language of the geocoded values handed to callers. Pinned on the request itself
 * rather than inherited from GOOGLE_MAPS_UI_LANGUAGE, so localizing the map UI later
 * cannot silently flip emirateName to another script and break emirate matching.
 * Verified to produce output identical to the SDK default at the current UI language.
 */
const GEOCODER_RESULT_LANGUAGE = "en";
const GOOGLE_MAP_SCRIPT_ID = "google-maps-script";
const DEFAULT_CENTER = { lat: 25.2048, lng: 55.2708 };

let googleMapsPromise: Promise<void> | null = null;

const loadGoogleMapsScript = (apiKey: string) => {
  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAP_SCRIPT_ID) as
      | HTMLScriptElement
      | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.google?.maps) {
          resolve();
          return;
        }

        googleMapsPromise = null;
        reject(new Error("Google Maps script loaded but API is unavailable"));
      }, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Google Maps failed")), {
        once: true,
      });
      return;
    }

    const authFailureHandler = () => {
      googleMapsPromise = null;
      reject(new Error("Google Maps authentication failed"));
    };

    window.gm_authFailure = authFailureHandler;
    window.__googleMapsInitMapPicker__ = () => {
      resolve();
      delete window.__googleMapsInitMapPicker__;
      delete window.gm_authFailure;
    };

    const script = document.createElement("script");
    script.id = GOOGLE_MAP_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&callback=__googleMapsInitMapPicker__&loading=async&language=${GOOGLE_MAPS_UI_LANGUAGE}`;
    script.onerror = () => {
      googleMapsPromise = null;
      delete window.gm_authFailure;
      delete window.__googleMapsInitMapPicker__;
      reject(new Error("Google Maps failed"));
    };

    document.body.appendChild(script);
  });

  return googleMapsPromise;
};

const getEmirateNameFromGeocoderResult = (result?: GoogleGeocoderResult) => {
  const component = result?.address_components?.find((item) =>
    item.types.includes("administrative_area_level_1")
  );

  return component?.long_name || component?.short_name;
};

const reverseGeocode = (
  geocoder: InstanceType<GoogleMapsApi["maps"]["Geocoder"]>,
  position: GoogleLatLngLiteral
) => {
  return new Promise<{ address: string; emirateName?: string }>((resolve, reject) => {
    geocoder.geocode(
      { location: position, language: GEOCODER_RESULT_LANGUAGE },
      (results, status) => {
        if (status === "OK" && results?.[0]?.formatted_address) {
          resolve({
            address: results[0].formatted_address,
            emirateName: getEmirateNameFromGeocoderResult(results[0]),
          });
          return;
        }

        reject(new Error(status || "Reverse geocoding failed"));
      }
    );
  });
};

const geocodeAddress = (
  geocoder: InstanceType<GoogleMapsApi["maps"]["Geocoder"]>,
  address: string
) => {
  return new Promise<GoogleLatLngLiteral | null>((resolve) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status !== "OK" || !results?.[0]?.geometry?.location) {
        resolve(null);
        return;
      }

      const location = results[0].geometry.location;
      resolve({
        lat: location.lat(),
        lng: location.lng(),
      });
    });
  });
};

const waitForContainerReady = (
  element: HTMLDivElement,
  signal: AbortSignal
): Promise<void> => {
  return new Promise((resolve) => {
    const observer = new IntersectionObserver((entries) => {
      if (
        entries.some(
          (entry) =>
            entry.isIntersecting &&
            entry.intersectionRect.width > 0 &&
            entry.intersectionRect.height > 0
        )
      ) {
        cleanup();
        resolve();
      }
    });
    const handleAbort = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      observer.disconnect();
      signal.removeEventListener("abort", handleAbort);
    };

    observer.observe(element);
    signal.addEventListener("abort", handleAbort, { once: true });
    if (signal.aborted) handleAbort();
  });
};

const GoogleMapPicker: React.FC<GoogleMapPickerProps> = ({
  value,
  centerAddress,
  interactive = true,
  latitude,
  longitude,
  onLocationSelect,
}) => {
  const { t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const markerRef = useRef<GoogleMarkerInstance | null>(null);
  const geocoderRef = useRef<InstanceType<GoogleMapsApi["maps"]["Geocoder"]> | null>(null);
  const mapTargetRef = useRef({ centerAddress, latitude, longitude });
  mapTargetRef.current = { centerAddress, latitude, longitude };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<GoogleMapError | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setLoading(false);
      setError("configurationMissing");
      return;
    }

    let active = true;
    const containerReadyAbortController = new AbortController();

    const initMap = async () => {
      try {
        await loadGoogleMapsScript(apiKey);

        if (!active || !mapContainerRef.current || !window.google?.maps) {
          return;
        }

        await waitForContainerReady(
          mapContainerRef.current,
          containerReadyAbortController.signal
        );

        if (!active || !mapContainerRef.current || !window.google?.maps) {
          return;
        }

        const googleMaps = window.google.maps;
        const map = new googleMaps.Map(mapContainerRef.current, {
          center: DEFAULT_CENTER,
          zoom: 11,
          clickableIcons: false,
          fullscreenControl: true,
          mapTypeControl: false,
          streetViewControl: false,
        });

        const geocoder = new googleMaps.Geocoder();

        mapRef.current = map;
        geocoderRef.current = geocoder;
        setError(null);

        window.setTimeout(() => {
          if (
            !active ||
            !mapRef.current ||
            markerRef.current ||
            mapTargetRef.current.centerAddress?.trim() ||
            typeof mapTargetRef.current.latitude === "number" ||
            typeof mapTargetRef.current.longitude === "number"
          ) {
            return;
          }

          mapRef.current.setCenter(DEFAULT_CENTER);
          mapRef.current.setZoom(11);
        }, 0);

        if (interactive) {
          map.addListener("click", async (event) => {
            if (!event.latLng || !mapRef.current || !geocoderRef.current) {
              return;
            }

            const position = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng(),
            };

            const setMarkerPosition = () => {
              if (!mapRef.current) {
                return;
              }

              if (!markerRef.current) {
                markerRef.current = new googleMaps.Marker({
                  map: mapRef.current,
                  position,
                });
              } else {
                markerRef.current.setPosition(position);
              }
            };

            try {
              const { address, emirateName } = await reverseGeocode(
                geocoderRef.current,
                position
              );
              const accepted = onLocationSelect({
                address,
                emirateName,
                latitude: position.lat,
                longitude: position.lng,
              });

              if (accepted !== false) {
                setMarkerPosition();
                setError(null);
              }
            } catch {
              const accepted = onLocationSelect({
                latitude: position.lat,
                longitude: position.lng,
              });

              if (accepted !== false) {
                setMarkerPosition();
              }
              setError("resolveAddressFailed");
            }
          });
        }
      } catch {
        if (active) {
          setError("loadFailed");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    initMap();

    return () => {
      active = false;
      containerReadyAbortController.abort();
    };
  }, [apiKey, interactive, onLocationSelect]);

  useEffect(() => {
    if (
      !centerAddress?.trim() ||
      loading ||
      typeof latitude === "number" ||
      typeof longitude === "number" ||
      !mapRef.current ||
      !geocoderRef.current
    ) {
      return;
    }

    let active = true;

    const syncCenterAddressToMap = async () => {
      const position = await geocodeAddress(
        geocoderRef.current!,
        centerAddress.trim()
      );

      if (!active || !position || !mapRef.current) {
        return;
      }

      mapRef.current.setCenter(position);
      mapRef.current.setZoom(10);
    };

    syncCenterAddressToMap();

    return () => {
      active = false;
    };
  }, [centerAddress, latitude, loading, longitude]);

  useEffect(() => {
    if (
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      mapRef.current &&
      window.google?.maps
    ) {
      const position = {
        lat: latitude,
        lng: longitude,
      };

      mapRef.current.setCenter(position);
      mapRef.current.setZoom(15);

      if (!markerRef.current) {
        markerRef.current = new window.google.maps.Marker({
          map: mapRef.current,
          position,
        });
      } else {
        markerRef.current.setPosition(position);
      }

      return;
    }

    if (!interactive) {
      return;
    }

    if (!value?.trim()) {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }

      return;
    }

    if (!mapRef.current || !geocoderRef.current) {
      return;
    }

    let active = true;

    const syncAddressToMap = async () => {
      const position = await geocodeAddress(geocoderRef.current!, value.trim());

      if (!active || !position || !mapRef.current || !window.google?.maps) {
        return;
      }

      mapRef.current.setCenter(position);
      mapRef.current.setZoom(15);

      if (!markerRef.current) {
        markerRef.current = new window.google.maps.Marker({
          map: mapRef.current,
          position,
        });
      } else {
        markerRef.current.setPosition(position);
      }
    };

    syncAddressToMap();

    return () => {
      active = false;
    };
  }, [interactive, latitude, loading, longitude, value]);

  return (
    <div className="filming-locations-map-picker">
      <div className="filming-locations-map-frame" ref={mapContainerRef} />
      {loading ? (
        <div className="filming-locations-map-status">
          {t("AddressList.map.loading")}
        </div>
      ) : null}
      {error ? (
        <div className="filming-locations-map-status is-error">
          {error === "configurationMissing"
            ? t("AddressList.map.configurationMissing")
            : error === "resolveAddressFailed"
              ? t("AddressList.map.resolveAddressFailed")
              : t("AddressList.map.loadFailed")}
        </div>
      ) : null}
      {interactive ? (
        <div className="filming-locations-map-hint">
          {t("AddressPicker.mapHint")}
        </div>
      ) : null}
    </div>
  );
};

export default GoogleMapPicker;
