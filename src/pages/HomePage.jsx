import React from "react";
import { FaSearch } from "react-icons/fa";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

const SectionTitle = ({ children }) => (
  <h2 className="text-2xl md:text-3xl font-bold text-neutral-900">{children}</h2>
);

const Card = ({ image, title, desc }) => (
  <div className="bg-white rounded-2xl border overflow-hidden shadow-sm card-hover-effect">
    <img src={image} alt={title} className="h-48 w-full object-cover" loading="lazy" />
    <div className="p-6">
      <div className="font-semibold text-neutral-900">{title}</div>
      <p className="mt-2 text-sm text-neutral-600">{desc}</p>
    </div>
  </div>
);

const MiniCard = ({ image, title, desc }) => (
  <div className="neumorphic-shadow bg-white rounded-2xl overflow-hidden">
    <img src={image} alt={title} className="h-64 w-full object-cover" loading="lazy" />
    <div className="p-5">
      <div className="font-semibold text-neutral-900">{title}</div>
      <p className="mt-2 text-sm text-neutral-600">{desc}</p>
    </div>
  </div>
);

const HomePage = () => {
  return (
    <>
      <Header />

      {/* HERO with your exact image URL + gradient overlay */}
      <section
        id="hero"
        className="relative h-[60vh] min-h-[480px] flex items-center justify-center text-center text-white bg-cover bg-center hero-image-overlay"
        style={{
          backgroundImage:
            `linear-gradient(rgba(17,33,32,0.5), rgba(17,33,32,0.7)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuCERO0mJRa0C5b8nfoEbZ02WYWLNgo1q1K9SdRDbgkWeuFTn9uR-WFnEl4leicScEd1-Nq77ffXT3ZygGPVXuF84_Jqsjx7EjTlVasqorCu40Ue1zQ-iHrokMzCd-WPkMG1OABR1lzOYx8pOC_PXo8xQPlx2uqRHLCOyRyRMegnAWV2gkZlJ9szW7-8z-16SCxoniaJHsxJxaubkZzRyXGiFH6SEHYrSBiM71UGQ4JYW2oSy_BjFesDJoYPo5Hy-1E_I5tqqIMIeA")`
        }}
      >
        <div class="absolute inset-0 bg-black/30"></div>
        <div className="container mx-auto px-6 z-10">
          <h1 className="text-4xl md:text-6xl font-semibold leading-tight">
            Connect, Collaborate, and Grow Your M&amp;A Network
          </h1>
          <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto text-white/90">
            IMAA Connect is the premier platform for M&amp;A professionals to
            discover events, engage with peers, and access valuable resources.
          </p>
          <a
            href="#events"
            className="btn-glow mt-8 inline-flex px-8 py-3 rounded-xl text-lg font-bold bg-teal-600 text-white hover:bg-teal-700"
          >
            Explore Events
          </a>
        </div>
      </section>

      {/* Search */}
      <div className="-mt-8 relative z-20 container mx-auto px-6">
        <div className="relative rounded-xl bg-white/90 backdrop-blur border border-teal-500/20 shadow-lg">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-600" />
          <input
            type="search"
            placeholder="Search for events by keyword or location"
            className="w-full pl-12 pr-4 py-4 rounded-xl bg-transparent outline-none text-neutral-800 placeholder-neutral-500"
          />
        </div>
      </div>

      {/* Featured Events */}
      <section id="events" className="py-16 md:py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center">Featured Events</h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuBHKjDgAAMcSOy6ZsGC9_IG-SmJR4XLhvxvQGjuOs4Vuj9EicNWSohpqOz76rcop0_KtYJrD--JYG3XgdfGUjjLTc3VGAcREdHC66b7TYZ4fPy8Y127xDhvRyqXhdIPcLHnc3HOlh5-AMjErYzkAy0kfaaB9WwKYbooqpeoZ6iKUZbT5fdW_JOy4Qxs-rxvaw3uA-K7_vFbg1N1_yZcmCEZ-PISeaU89b1Noeujcgstqz_vZozsyNQS0PlCf6gSc1ZgeVqz2-06iw"
              title="The Annual M&A Summit"
              desc="Join industry leaders for a comprehensive discussion on the latest trends and strategies in M&A."
            />
            <Card
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuC7qbyvHcPpq_a2ygXhgDS0hwTjng9aqdknkd-88U7vRbfjLylj6lT-CcfNgN3o22jXfQO2FmQw3EnBy5wkeRmBBqQm2BjmIXNOnU-iy6L2HfsFG83nh8SnY7UmZlHpm5dD83jG9ZK4vbT8BHxf4mOJNny4e_xLTbFFIZLJHgZIQiT5CuXSSiwFgLRlhSJRQfonxdF9g0aS6zi6Ds2T34s6gEVkm2YQt5uI0X_Gn11HdCYl9czQSWyL40jEpHFF7VPUf5K4eV2nmw"
              title="Networking Mixer for Dealmakers"
              desc="Connect with fellow M&A professionals in a relaxed and informal setting."
            />
            <Card
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuB_vYOi0Vx1itEKNE1xoWbuGSfhITt0QckUhELW-KUQ5tF-XfqqVlX0EBdPftpzh_lylwhZulVLWeR3fgM65aDuH1GZCZXVlyH5rfhb2uGRl1Tf_EZxDU3hC1HzoAgqKm6HvpGwOXlxtn-ZWs3OFNY6RrIhzQiodfsFp9e0SBGBksjVA6vHjdoOFhwlKF8U4bAPkY7N3RO-nxcaal6XSiEhPcNOwE-lyVZVon33K62EV3zS_9DVE20b4AxVgH70UcScGFiONOGOFQ"
              title="Advanced Valuation Techniques"
              desc="Enhance your skills with this hands-on workshop led by experienced valuation experts."
            />
          </div>
        </div>
      </section>

      {/* Community Highlights */}
      <section id="community" className="py-16 md:py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center">Community Highlights</h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <MiniCard
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuDdSPl7HlGanqF5RiHaWSVQ9QI2CYal_9-3lhgFRuUcj0LJ7FyigScYCf42bDup4QYrla0Aln-C46uqeXJhIAksFjdBMKfMlx_XL76mZWGp5BfQfXPY5QK2DoXBXPXXgOu-5o9NfaoHXbPutMkZQKI90QZLq2rz60xJrX6Ai2ZtuTA-p3Z7OmGbaSqKCuLIgLgHHa3cZbj2wjcEa2RzvP2CsMOmz4Ele0pUh4DmzsREvZpWCqFWyomvrXSxSqxYLdpE8Rqhp6NOVw"
              title="Member Spotlight: Sarah Chen"
              desc="Learn about Sarah Chen’s journey and insights in the M&A industry."
            />
            <MiniCard
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuCQW-ZoVKENpsFY1tjGkibf08ZkqKxluVLOwsfGJgAXDPQe3ARaxI0Fpq8kvwyPzBs_xUqZ99oTq0tCiEIBdPjYmlXmuJaQ_NNWaJJ4Slt0Is4kMTPG7EBC4DGWIkdkjA4PG8kTikw8UF-U_yf8mdO89_yz10W74VT6tRaEJwPFzMHfhN_pJTYCN4vP9c8p67yFfQrKgTOqNZs_u7vwTAVuNqlWDxuMSUDiOoVQ4RjquGzVTeIuaFu1lUidUFC-Z1pk7-ZY-j9M8A"
              title="Upcoming Community Meetup"
              desc="Join us for an informal gathering to discuss current market trends."
            />
            <MiniCard
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuDpUlccQRm1PXSS0loNs-FKCqJTs4a7F_YMYhd-hWRaPT2NmhXcGfJSEbAEXEiV1YJWFOPV2ZFhpmcXmvvCxdK8LvzQevucug9zBpmskeywIkcStxazGqZ6pNPZk3PCYgx7DTh5lMxamy0J8FQ91lyswO3lzn5ReWAmmE9XvkrBuHhhaK3K9f97ozDa_VcaF_Jnhf-cdNxLVeU85fS7w_5zed_VX1KW1lhohLNn2fXdZs4djuNERHa-la-kQoGfpE36EWIB4qn3oQ"
              title="Ask Me Anything with David Lee"
              desc="Get your questions answered by David Lee, a seasoned M&A advisor."
            />
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">
            Stay Updated with Our Newsletter
          </h2>
          <p className="mt-4 text-lg max-w-2xl mx-auto text-neutral-600">
            Get the latest news, event announcements, and exclusive content delivered straight to your inbox.
          </p>
          <form onSubmit={(e) => e.preventDefault()} className="mt-8 max-w-lg mx-auto flex">
            <input
              type="email"
              required
              placeholder="Enter your email"
              className="w-full px-4 py-3 rounded-l-xl border border-r-0"
            />
            <button type="submit" className="btn-glow px-6 py-3 rounded-r-xl bg-teal-600 text-white font-semibold">
              Subscribe
            </button>
          </form>
        </div>
      </section>

      {/* anchors */}
      <div id="resources" className="scroll-mt-24" />
      <div id="about" className="scroll-mt-24" />

      <Footer />
    </>
  );
};

export default HomePage;
