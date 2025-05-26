const ProgressCircle = ({ progress, size = 40, strokeWidth = 5 }) => {
  // Ensure progress is between 0 and 100
  const validProgress = Math.min(Math.max(progress, 0), 100);
  
  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (validProgress / 100) * circumference;
  
  // Define colors based on progress
  const getColor = (value) => {
    if (value >= 80) return '#22c55e'; // Green
    if (value >= 50) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={`0 0 ${size} ${size}`}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e6e6e6"
        strokeWidth={strokeWidth}
      />
      
      {/* Progress circle */}
      <circle
        className="progress-ring__circle"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={getColor(validProgress)}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
      />
      
      {/* Progress text */}
      <text
        x="50%"
        y="50%"
        dy=".3em"
        textAnchor="middle"
        fontSize={size / 4}
        fontWeight="bold"
        fill={getColor(validProgress)}
      >
        {validProgress}%
      </text>
    </svg>
  );
};

export default ProgressCircle; 