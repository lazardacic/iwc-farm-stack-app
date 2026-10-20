import { useLocation } from "react-router-dom";

// Shows the current URL so tests can assert on query params the page writes.
const LocationProbe = () => {
  const location = useLocation();

  return (
    <output data-testid="location">{`${location.pathname}${location.search}`}</output>
  );
};

export default LocationProbe;
