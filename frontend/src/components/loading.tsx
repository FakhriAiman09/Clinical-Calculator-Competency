import { getLoadingAriaRole, getLoadingText } from '@/utils/loading-utils';

export default function Loading() {
  return (
    <div className='spinner-border' role={getLoadingAriaRole()}>
      <span className='visually-hidden'>{getLoadingText()}</span>
    </div>
  );
}
