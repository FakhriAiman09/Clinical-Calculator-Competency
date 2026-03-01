import Header from '@/components/header';

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className='d-flex flex-column min-vh-100'>
      <div className='row sticky-top'>
        <Header />
      </div>
      {children}
    </div>
  );
} // end Layout
