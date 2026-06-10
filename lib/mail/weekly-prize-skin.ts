interface WeeklyPrizeItem {
  name: string;
  image?: string;
  price?: number;
}

const weeklyPrizeSkinMail = (
  displayName: string,
  weeklyPrize: WeeklyPrizeItem,
  weekStartDate: string,
  weekEndDate: string
) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Weekly Prize Skin Sent - CS2DLE</title>
      </head>
      <body>
        <div
          style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            background-color: #070608;
            color: white;
          "
        >
          <div style="text-align: center; margin-bottom: 30px; padding-top: 30px">
            <h1 style="color: #40ff00; margin: 0">
              <img src="https://e.hypermatic.com/db0f67338e5d56ea98293718bafe8562.png" alt="CS2DLE Logo" />
            </h1>
          </div>

          <div style="background-color: #111115; padding: 30px">
            <h2 style="color: #ffffff; margin-top: 0; width: 100%; text-align: center">
              🎮 Weekly Prize Sent to Your Steam Account!
            </h2>
            <p
              style="
                font-size: 16px;
                line-height: 1.6;
                color: #cecece;
                text-align: center;
              "
            >
              Congratulations ${displayName}! Your weekly prize skin has been sent to your Steam account via trade offer.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #1a1a1a; padding: 20px; display: inline-block; border: 1px solid #FFD700;">
                ${
                  weeklyPrize.image
                    ? `<img src="${weeklyPrize.image}" alt="${weeklyPrize.name}" style="width: 120px; height: 90px; object-fit: contain; margin-bottom: 15px; border-radius: 5px;">`
                    : ""
                }
                <h3 style="color: #FFD700; margin: 0 0 10px 0; font-size: 18px;">${
                  weeklyPrize.name
                }</h3>
                ${
                  weeklyPrize.price
                    ? `<p style="margin: 0; color: #FFD700; font-size: 16px; font-weight: bold;">$${weeklyPrize.price.toFixed(
                        2
                      )}</p>`
                    : ""
                }
                <p style="margin: 10px 0 0 0; color: #888; font-size: 12px;">
                  Week: ${formatDate(weekStartDate)} - ${formatDate(
    weekEndDate
  )}
                </p>
              </div>
            </div>

            <p
              style="
                font-size: 16px;
                line-height: 1.6;
                text-align: center;
                margin: 20px 0;
                color: #cecece;
              "
            >
              A trade offer has been sent to your registered Steam trade link. 
              Please check your Steam inventory and accept the trade to receive your prize!
            </p>

            <div style="text-align: center; margin: 20px 0;">
              <div style="background-color: #1a1a1a; padding: 15px; display: inline-block; border-radius: 5px;">
                <p style="margin: 0; color: #40ff00; font-size: 14px;">
                  ✅ Trade Status: <strong>Sent</strong>
                </p>
                <p style="margin: 5px 0 0 0; color: #888; font-size: 12px;">
                  Check your Steam trade offers to accept
                </p>
              </div>
            </div>

            <div style="text-align: center; margin: 20px 0;">
              <a
                href="https://steamcommunity.com/my/tradeoffers/"
                style="
                  display: inline-block;
                  width: 212px;
                  background-color: #FFD700;
                  color: #000000;
                  font-family: 'Inter', 'Arial', sans-serif;
                  font-size: 13px;
                  font-weight: normal;
                  line-height: 100%;
                  margin: 0 10px 10px 0;
                  text-decoration: none;
                  text-transform: none;
                  padding: 10px 0px 10px 0px;
                  mso-padding-alt: 0;
                  border-radius: 5px 5px 5px 5px;
                "
                target="_blank"
              >
                <span
                  style="
                    font-size: 14px;
                    font-family: 'Inter', 'Arial', sans-serif;
                    font-weight: 700;
                    color: #000000;
                    line-height: 121%;
                    mso-line-height-alt: 17px;
                  "
                  >View Trade Offers</span
                >
              </a>
            </div>

            <div style="text-align: center;">
              <a
                href="https://cs2dle.net/"
                style="
                  display: inline-block;
                  width: 212px;
                  background-color: #40ff00;
                  color: #000000;
                  font-family: 'Inter', 'Arial', sans-serif;
                  font-size: 13px;
                  font-weight: normal;
                  line-height: 100%;
                  margin: 0;
                  text-decoration: none;
                  text-transform: none;
                  padding: 10px 0px 10px 0px;
                  mso-padding-alt: 0;
                  border-radius: 5px 5px 5px 5px;
                "
                target="_blank"
              >
                <span
                  style="
                    font-size: 14px;
                    font-family: 'Inter', 'Arial', sans-serif;
                    font-weight: 700;
                    color: #000000;
                    line-height: 121%;
                    mso-line-height-alt: 17px;
                  "
                  >Play CS2DLE</span
                >
              </a>
            </div>
          </div>

          <div style="text-align: center; font-size: 12px; color: #666; padding-bottom: 5px; padding-top: 20px;">
            <div style="text-align: center; margin-bottom: 5px;">
              <table style="margin: 0 auto; border-collapse: collapse;">
                <tr>
                  <td style="padding-right: 10px;">
                    <a href="https://www.instagram.com/cs2dle/" target="_blank">
                      <img
                        alt="Instagram"
                        height="25"
                        src="https://e.hypermatic.com/a217a2b26d51c70f004ce63d2b98a358.png"
                        style="display: block;"
                        width="25"
                      />
                    </a>
                  </td>
                  <td style="padding-right: 10px;">
                    <a href="https://discord.gg/BceX4KdN2J" target="_blank">
                      <img
                        alt="Discord"
                        height="25"
                        src="https://e.hypermatic.com/e0e33b80a8cf7a00a0ad1dfbece16102.png"
                        style="display: block"
                        width="25"
                      />
                    </a>
                  </td>
                  <td style="padding-right: 10px;">
                    <a href="https://x.com/cs2dle" target="_blank">
                      <img
                        alt="X"
                        height="25"
                        src="https://e.hypermatic.com/e7c022fe8d011c09236133f435f312f3.png"
                        style="display: block"
                        width="25"
                      />
                    </a>
                  </td>
                  <td>
                    <a href="https://www.tiktok.com/@cs2dleclips" target="_blank">
                      <img
                        alt="Tiktok"
                        height="25"
                        src="https://e.hypermatic.com/746cc8ea0f7ab5cf08f5f81a4c9207a3.png"
                        style="display: block"
                        width="25"
                      />
                    </a>
                  </td>
                </tr>
              </table>
            </div>
            <div style="text-align: center; font-size: 12px; color: #666;">
              <p>© 2025 CS2dle. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

export default weeklyPrizeSkinMail;

