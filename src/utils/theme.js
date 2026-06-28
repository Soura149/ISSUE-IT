export const getSeverityStyles = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'low': return 'bg-[#00FF66] text-black border-black';
    case 'medium': return 'bg-[#FFCC00] text-black border-black';
    case 'high':
    case 'critical': return 'bg-[#FF3333] text-white border-black';
    default: return 'bg-white text-black border-black'; // Fallback
  }
};
