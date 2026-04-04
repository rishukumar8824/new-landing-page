export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/p2p-clone.html',
      permanent: false,
    },
  };
}

export default function P2PRedirectPage() {
  return null;
}
