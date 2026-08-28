/**
 * Trigger authentication state change event
 * Used to notify other parts of the application (such as NotificationContext) that the authentication state has changed
 */
export const triggerAuthChange = () => {
  console.log('Triggering auth-changed event');
  window.dispatchEvent(new Event('auth-changed'));
};
