import { createContext, useContext } from 'react';

const TabsContext = createContext();

export function Tabs({ value, onValueChange, children, className = '' }) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }) {
  return (
    <div className={`flex space-x-1 ${className}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children }) {
  const { value: activeValue, onValueChange } = useContext(TabsContext);
  const isActive = value === activeValue;

  return (
    <button
      onClick={() => onValueChange(value)}
      className={`px-4 py-3 font-medium transition-all duration-200 relative ${
        isActive
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      {children}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
      )}
    </button>
  );
}

export function TabsContent({ value, children, className = '' }) {
  const { value: activeValue } = useContext(TabsContext);

  if (value !== activeValue) return null;

  return <div className={className}>{children}</div>;
}
