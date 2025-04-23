"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

interface UserProfileDTO {
  id?: number;
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const defaultFormData: Omit<UserProfileDTO, 'createdAt' | 'updatedAt'> = {
  userId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  notes: ''
};

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i}>
            <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
      <div>
        <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
      <div className="flex justify-end">
        <div className="h-10 w-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

export default function ProfileForm() {
  const router = useRouter();
  const { userId } = useAuth();

  // Add immediate console log for debugging
  console.log('DEBUG - Environment Check:', {
    apiUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    isDefined: typeof process.env.NEXT_PUBLIC_API_BASE_URL !== 'undefined',
    envKeys: Object.keys(process.env)
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<UserProfileDTO, 'createdAt' | 'updatedAt'>>(defaultFormData);
  const [profileId, setProfileId] = useState<number | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      console.log('Current userId:', userId); // Changed to console.log

      if (!userId) {
        console.log('No userId available, skipping profile fetch');
        return;
      }

      try {
        setInitialLoading(true);

        // Log all environment variables (only in development)
        if (process.env.NODE_ENV === 'development') {
          console.log('Environment variables:', {
            NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
            NODE_ENV: process.env.NODE_ENV
          });
        }

        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        console.log('API Base URL:', apiBaseUrl); // Changed to console.log

        if (!apiBaseUrl) {
          console.error('API base URL is not configured');
          setError("API configuration error - please check environment variables");
          return;
        }

        console.log('Fetching profile for userId:', userId);

        // Use userId.equals as a query parameter
        const queryParams = new URLSearchParams({
          'userId.equals': userId
        });

        const url = `${apiBaseUrl}/api/user-profiles?${queryParams}`;
        console.log('Full URL being fetched:', url); // Changed to console.log

        try {
          const response = await fetch(url, {
            headers: {
              'Content-Type': 'application/json',
            },
          });

          console.log('Response status:', response.status);

          if (!response.ok) {
            if (response.status === 404) {
              console.log('No profile found for userId:', userId);
              return;
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log('Profile data received:', data);

          // Since we're using userId.equals, we should get either an empty array or an array with one item
          const userProfile = Array.isArray(data) ? data[0] : data;

          if (userProfile) {
            setProfileId(userProfile.id);
            // Filter out any null or undefined values to avoid spreading them
            const cleanData = Object.fromEntries(
              Object.entries(userProfile).filter(([_, value]) => value != null)
            );
            setFormData(prev => ({
              ...defaultFormData,
              ...cleanData
            }));
            console.log('Profile data set:', cleanData);
          } else {
            console.log('No profile data found in response');
          }
        } catch (fetchError) {
          console.error('Fetch error:', fetchError);
          const errorMessage = fetchError instanceof Error ? fetchError.message : 'Failed to fetch profile';
          throw new Error(`Network error: ${errorMessage}`);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setError(error instanceof Error ? error.message : "Failed to fetch profile data");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      console.debug('No userId available, cannot submit form');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
        throw new Error("API base URL is not configured");
      }

      console.debug('Checking if profile exists for userId:', userId);

      // First check if profile exists
      const queryParams = new URLSearchParams({
        'userId.equals': userId
      });

      const checkResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user-profiles?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const existingProfiles = await checkResponse.json();
      const existingProfile = Array.isArray(existingProfiles) ? existingProfiles[0] : existingProfiles;

      console.debug('Existing profile check result:', existingProfile);

      const profileData = {
        ...(existingProfile?.id ? { id: existingProfile.id } : {}),
        userId,
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        email: formData.email || '',
        phone: formData.phone || '',
        addressLine1: formData.addressLine1 || '',
        addressLine2: formData.addressLine2 || '',
        city: formData.city || '',
        state: formData.state || '',
        zipCode: formData.zipCode || '',
        country: formData.country || '',
        notes: formData.notes || '',
        createdAt: existingProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const method = existingProfile ? 'PUT' : 'POST';
      const apiUrl = existingProfile
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user-profiles/${existingProfile.id}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user-profiles`;

      console.debug(`${method}ing profile data:`, profileData);

      const response = await fetch(apiUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to ${method.toLowerCase()} profile`);
      }

      console.debug('Profile saved successfully');

      // Show success message before redirecting
      setError(null);
      // Use replace to prevent back navigation to the form
      router.replace("/");
    } catch (error) {
      console.error("Error saving profile:", error);
      setError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto p-4">
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            First Name *
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Last Name *
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700">
            Address Line 1
          </label>
          <input
            type="text"
            id="addressLine1"
            name="addressLine1"
            value={formData.addressLine1 || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700">
            Address Line 2
          </label>
          <input
            type="text"
            id="addressLine2"
            name="addressLine2"
            value={formData.addressLine2 || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
            City
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700">
            State
          </label>
          <input
            type="text"
            id="state"
            name="state"
            value={formData.state || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
            ZIP Code
          </label>
          <input
            type="text"
            id="zipCode"
            name="zipCode"
            value={formData.zipCode || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700">
            Country
          </label>
          <input
            type="text"
            id="country"
            name="country"
            value={formData.country || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes || ""}
          onChange={handleChange}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Skip
        </button>
        <button
          type="submit"
          disabled={loading}
          className={`bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </form>
  );
}