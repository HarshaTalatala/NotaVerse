// Hybrid service that can switch between Firebase and Azure Functions

import { useAlumni as useAlumniFirebase } from './useAlumni';
import { useStudentsAPI } from './useStudentsAPI';

// Configuration to switch data sources
const DATA_SOURCE = process.env.VITE_DATA_SOURCE || 'firebase'; // 'firebase' | 'azure' | 'hybrid'

export function useStudentsHybrid() {
  switch (DATA_SOURCE) {
    case 'azure':
      return useStudentsAPI();
    case 'firebase':
    default:
      // Return Firebase version adapted to match Azure API structure
      return useStudentsFirebase();
  }
}

// Adapter for Firebase to match Azure API structure
function useStudentsFirebase() {
  // Your existing Firebase implementation but adapted
  // This allows seamless switching between backends
}