import React from 'react';

type CardElement = 'div' | 'section' | 'article' | 'li';

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  padded?: boolean;
  shadow?: boolean;
  as?: CardElement;
}

export const Card: React.FC<CardProps> = ({
  padded = true,
  shadow = true,
  className = '',
  as: Component = 'div',
  children,
  ...rest
}) => {
  return (
  <Component
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl ${
        shadow ? 'shadow-sm hover:shadow-md transition-shadow' : ''
      } ${padded ? 'p-6' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
};

export default Card;
