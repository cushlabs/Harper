package health.harper;

import io.quarkus.test.junit.QuarkusIntegrationTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.when;

/**
 * Integration smoke test — boots the packaged application and checks readiness.
 * Runs under `mvn verify` (maven-failsafe-plugin picks up *IT classes).
 */
@QuarkusIntegrationTest
class SmokeIT {

    @Test
    void applicationIsReady() {
        when().get("/q/health/ready").then().statusCode(200);
    }
}
