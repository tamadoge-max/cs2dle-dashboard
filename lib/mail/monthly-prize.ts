interface MonthlyPrizeItem {
  name: string;
  image?: string;
  price?: number;
}

/**
 * Email template for monthly prize assignment when user has valid crypto address
 */
export const monthlyPrizeAssignedValidMail = (
  displayName: string,
  monthlyPrize: MonthlyPrizeItem,
  monthYear: string
) => {
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Monthly Prize Assigned - CS2DLE</title>
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
              <img src="https://cs2dle.net/images/logo/logo.svg" alt="CS2DLE Logo" style="height: 40px;" />
            </h1>
          </div>

          <div style="background-color: #111115; padding: 30px">
            <h2 style="color: #ffffff; margin-top: 0; width: 100%; text-align: center">
              🎉 Monthly Prize Assigned!
            </h2>
            <p
              style="
                font-size: 16px;
                line-height: 1.6;
                color: #cecece;
                text-align: center;
              "
            >
              Congratulations ${displayName}! You've been awarded the monthly prize for ${formatMonth(monthYear)}!
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #1a1a1a; padding: 20px; display: inline-block; border: 1px solid #FFD700;">
                ${monthlyPrize.image ? `<img src="${monthlyPrize.image}" alt="${monthlyPrize.name}" style="width: 120px; height: 90px; object-fit: contain; margin-bottom: 15px; border-radius: 5px;">` : ''}
                <h3 style="color: #FFD700; margin: 0 0 10px 0; font-size: 18px;">${monthlyPrize.name}</h3>
                ${monthlyPrize.price ? `<p style="margin: 0; color: #FFD700; font-size: 16px; font-weight: bold;">$${monthlyPrize.price.toFixed(2)}</p>` : ''}
                <p style="margin: 10px 0 0 0; color: #888; font-size: 12px;">
                  ${formatMonth(monthYear)}
                </p>
              </div>
            </div>

            <div style="text-align: center; margin: 20px 0;">
              <div style="background-color: #1a1a1a; padding: 15px; display: inline-block; border-radius: 5px; border: 1px solid #40ff00;">
                <p style="margin: 0; color: #40ff00; font-size: 14px;">
                  ✅ Prize Status: <strong>Assigned</strong>
                </p>
                <p style="margin: 5px 0 0 0; color: #888; font-size: 12px;">
                  Your cryptocurrency address has been verified and your prize will be processed soon.
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
              Your monthly prize has been successfully assigned. We will process the delivery to your verified wallet address shortly.
            </p>

            <div style="text-align: center;">
              <a
                href="https://cs2dle.net/"
                style="
                  display: inline-block;
                  width: 212px;
                  background-color: #FFD700;
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
                  >View My Profile</span
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

/**
 * Email template for monthly prize assignment when user has invalid crypto address
 */
export const monthlyPrizeAssignedInvalidMail = (
  displayName: string,
  monthlyPrize: MonthlyPrizeItem,
  monthYear: string
) => {
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Monthly Prize Assigned - CS2DLE</title>
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
              <img src="https://cs2dle.net/images/logo/logo.svg" alt="CS2DLE Logo" style="height: 40px;" />
            </h1>
          </div>

          <div style="background-color: #111115; padding: 30px">
            <h2 style="color: #ffffff; margin-top: 0; width: 100%; text-align: center">
              🎉 Monthly Prize Assigned!
            </h2>
            <p
              style="
                font-size: 16px;
                line-height: 1.6;
                color: #cecece;
                text-align: center;
              "
            >
              Congratulations ${displayName}! You've been awarded the monthly prize for ${formatMonth(monthYear)}!
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #1a1a1a; padding: 20px; display: inline-block; border: 1px solid #FFD700;">
                ${monthlyPrize.image ? `<img src="${monthlyPrize.image}" alt="${monthlyPrize.name}" style="width: 120px; height: 90px; object-fit: contain; margin-bottom: 15px; border-radius: 5px;">` : ''}
                <h3 style="color: #FFD700; margin: 0 0 10px 0; font-size: 18px;">${monthlyPrize.name}</h3>
                ${monthlyPrize.price ? `<p style="margin: 0; color: #FFD700; font-size: 16px; font-weight: bold;">$${monthlyPrize.price.toFixed(2)}</p>` : ''}
                <p style="margin: 10px 0 0 0; color: #888; font-size: 12px;">
                  ${formatMonth(monthYear)}
                </p>
              </div>
            </div>

            <div style="text-align: center; margin: 20px 0;">
              <div style="background-color: #1a1a1a; padding: 15px; display: inline-block; border-radius: 5px; border: 1px solid #ffaa00;">
                <p style="margin: 0; color: #ffaa00; font-size: 14px;">
                  ⚠️ Action Required: <strong>Update Crypto Address</strong>
                </p>
                <p style="margin: 5px 0 0 0; color: #888; font-size: 12px;">
                  Your cryptocurrency address needs to be updated before we can process your prize.
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
              Your monthly prize has been assigned, but we detected an issue with your cryptocurrency address. 
              Please update your wallet address in your profile to receive your prize.
            </p>

            <div style="text-align: center;">
              <a
                href="https://cs2dle.net/"
                style="
                  display: inline-block;
                  width: 212px;
                  background-color: #ffaa00;
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
                  >Update My Wallet</span
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

/**
 * Email template for monthly prize assignment when user has no crypto address
 */
export const monthlyPrizeAssignedNoAddressMail = (
  displayName: string,
  monthlyPrize: MonthlyPrizeItem,
  monthYear: string
) => {
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Monthly Prize Assigned - CS2DLE</title>
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
              <img src="https://cs2dle.net/images/logo/logo.svg" alt="CS2DLE Logo" style="height: 40px;" />
            </h1>
          </div>

          <div style="background-color: #111115; padding: 30px">
            <h2 style="color: #ffffff; margin-top: 0; width: 100%; text-align: center">
              🎉 Monthly Prize Assigned!
            </h2>
            <p
              style="
                font-size: 16px;
                line-height: 1.6;
                color: #cecece;
                text-align: center;
              "
            >
              Congratulations ${displayName}! You've been awarded the monthly prize for ${formatMonth(monthYear)}!
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #1a1a1a; padding: 20px; display: inline-block; border: 1px solid #FFD700;">
                ${monthlyPrize.image ? `<img src="${monthlyPrize.image}" alt="${monthlyPrize.name}" style="width: 120px; height: 90px; object-fit: contain; margin-bottom: 15px; border-radius: 5px;">` : ''}
                <h3 style="color: #FFD700; margin: 0 0 10px 0; font-size: 18px;">${monthlyPrize.name}</h3>
                ${monthlyPrize.price ? `<p style="margin: 0; color: #FFD700; font-size: 16px; font-weight: bold;">$${monthlyPrize.price.toFixed(2)}</p>` : ''}
                <p style="margin: 10px 0 0 0; color: #888; font-size: 12px;">
                  ${formatMonth(monthYear)}
                </p>
              </div>
            </div>

            <div style="text-align: center; margin: 20px 0;">
              <div style="background-color: #1a1a1a; padding: 15px; display: inline-block; border-radius: 5px; border: 1px solid #f093fb;">
                <p style="margin: 0; color: #f093fb; font-size: 14px;">
                  📋 Action Required: <strong>Add Crypto Address</strong>
                </p>
                <p style="margin: 5px 0 0 0; color: #888; font-size: 12px;">
                  You need to add a cryptocurrency address to receive your prize.
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
              Your monthly prize has been assigned, but you haven't entered a cryptocurrency address yet. 
              Please add your wallet address in your profile to receive your prize.
            </p>

            <div style="text-align: center; margin: 20px 0;">
              <div style="display: flex; justify-content: center; gap: 15px;">
                <div style="width: 50px; height: 50px; background: #f8f9fa; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #e9ecef;">
                  <img src="https://cs2dle.net/images/icon/btc.svg" alt="Bitcoin" style="width: 30px; height: 30px;" onerror="this.style.display='none'" />
                </div>
                <div style="width: 50px; height: 50px; background: #f8f9fa; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #e9ecef;">
                  <img src="https://cs2dle.net/images/icon/eth.svg" alt="Ethereum" style="width: 30px; height: 30px;" onerror="this.style.display='none'" />
                </div>
              </div>
            </div>

            <div style="text-align: center;">
              <a
                href="https://cs2dle.net/"
                style="
                  display: inline-block;
                  width: 212px;
                  background-color: #f093fb;
                  color: #ffffff;
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
                    color: #ffffff;
                    line-height: 121%;
                    mso-line-height-alt: 17px;
                  "
                  >Add My Wallet</span
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

/**
 * Email template for monthly prize delivery notification
 */
export const monthlyPrizeDeliveredMail = (
  displayName: string,
  monthlyPrize: MonthlyPrizeItem,
  monthYear: string
) => {
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Monthly Prize Delivered - CS2DLE</title>
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
              <img src="https://cs2dle.net/images/logo/logo.svg" alt="CS2DLE Logo" style="height: 40px;" />
            </h1>
          </div>

          <div style="background-color: #111115; padding: 30px">
            <h2 style="color: #ffffff; margin-top: 0; width: 100%; text-align: center">
              🎁 Monthly Prize Delivered!
            </h2>
            <p
              style="
                font-size: 16px;
                line-height: 1.6;
                color: #cecece;
                text-align: center;
              "
            >
              Congratulations ${displayName}! Your monthly prize for ${formatMonth(monthYear)} has been delivered!
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #1a1a1a; padding: 20px; display: inline-block; border: 1px solid #40ff00;">
                ${monthlyPrize.image ? `<img src="${monthlyPrize.image}" alt="${monthlyPrize.name}" style="width: 120px; height: 90px; object-fit: contain; margin-bottom: 15px; border-radius: 5px;">` : ''}
                <h3 style="color: #40ff00; margin: 0 0 10px 0; font-size: 18px;">${monthlyPrize.name}</h3>
                ${monthlyPrize.price ? `<p style="margin: 0; color: #40ff00; font-size: 16px; font-weight: bold;">$${monthlyPrize.price.toFixed(2)}</p>` : ''}
                <p style="margin: 10px 0 0 0; color: #888; font-size: 12px;">
                  ${formatMonth(monthYear)}
                </p>
              </div>
            </div>

            <div style="text-align: center; margin: 20px 0;">
              <div style="background-color: #1a1a1a; padding: 15px; display: inline-block; border-radius: 5px; border: 1px solid #40ff00;">
                <p style="margin: 0; color: #40ff00; font-size: 14px;">
                  ✅ Delivery Status: <strong>Delivered</strong>
                </p>
                <p style="margin: 5px 0 0 0; color: #888; font-size: 12px;">
                  Your item has been delivered, so please check your wallet.
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
              Your monthly prize has been successfully delivered to your verified wallet address. Please check your wallet to confirm receipt.
            </p>

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
                  >View My Profile</span
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

